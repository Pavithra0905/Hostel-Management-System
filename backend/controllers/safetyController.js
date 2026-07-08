/**
 * SAFETY CONTROLLER
 * Handles real-time location tracking, emergency alerts, escalations, and analytics.
 */

const db = require('../config/db');

const SAFE_ZONE_RADIUS_DEFAULT = 500;

const toRad = (value) => (value * Math.PI) / 180;

// Haversine distance in meters between two coordinates.
const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
};

const parseDateTime = (value) => {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const toMysqlDateTime = (dateObj) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())}`;
};

const getStudentIDForUser = async (userID) => {
  const [rows] = await db.query('SELECT studentID FROM students WHERE userID = ?', [userID]);
  return rows.length ? rows[0].studentID : null;
};

const escalatePendingAlerts = async () => {
  const [result] = await db.query(`
    UPDATE emergency_alerts
    SET status = 'escalated', updatedAt = NOW()
    WHERE status = 'pending'
      AND timestamp <= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
  `);

  if (result.affectedRows > 0) {
    console.log(`[Safety] Auto-escalated ${result.affectedRows} alert(s)`);
  }
};

const getActiveSafeZone = async () => {
  const [rows] = await db.query(
    `SELECT safeZoneID, zoneName, centerLatitude, centerLongitude, radiusMeters
     FROM safe_zones
     WHERE isActive = 1
     ORDER BY safeZoneID ASC
     LIMIT 1`
  );

  if (!rows.length) {
    return {
      safeZoneID: null,
      zoneName: 'Default Zone',
      centerLatitude: 12.9715987,
      centerLongitude: 77.5945627,
      radiusMeters: SAFE_ZONE_RADIUS_DEFAULT
    };
  }

  return rows[0];
};

const updateLocation = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { studentID, latitude, longitude, timestamp } = req.body;

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({
        success: false,
        message: 'Valid latitude and longitude are required'
      });
    }

    let effectiveStudentID = studentID;

    if (req.user.role === 'Student') {
      effectiveStudentID = await getStudentIDForUser(req.user.userID);
      if (!effectiveStudentID) {
        return res.status(404).json({
          success: false,
          message: 'Student profile not found for this user'
        });
      }
    }

    if (!effectiveStudentID) {
      return res.status(400).json({
        success: false,
        message: 'studentID is required'
      });
    }

    await connection.beginTransaction();

    const safeZone = await getActiveSafeZone();
    const eventTime = parseDateTime(timestamp);
    const eventTimeMysql = toMysqlDateTime(eventTime);

    const distance = calculateDistanceMeters(
      Number(safeZone.centerLatitude),
      Number(safeZone.centerLongitude),
      lat,
      lon
    );

    const insideSafeZone = distance <= Number(safeZone.radiusMeters || SAFE_ZONE_RADIUS_DEFAULT);

    const [locationInsert] = await connection.query(
      `INSERT INTO location_logs
       (studentID, safeZoneID, latitude, longitude, timestamp, isInsideSafeZone)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        effectiveStudentID,
        safeZone.safeZoneID,
        lat,
        lon,
        eventTimeMysql,
        insideSafeZone ? 1 : 0
      ]
    );

    let violationID = null;

    if (!insideSafeZone) {
      const [violationInsert] = await connection.query(
        `INSERT INTO safety_violations
         (studentID, locationLogID, violationType, latitude, longitude, occurredAt, status)
         VALUES (?, ?, 'OUTSIDE_SAFE_ZONE', ?, ?, ?, 'OPEN')`,
        [
          effectiveStudentID,
          locationInsert.insertId,
          lat,
          lon,
          eventTimeMysql
        ]
      );

      violationID = violationInsert.insertId;
      console.log(`[Safety Alert] Student ${effectiveStudentID} exited safe zone at ${lat}, ${lon}`);
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: insideSafeZone ? 'Location updated: student inside safe zone' : 'Location updated: violation recorded',
      data: {
        studentID: effectiveStudentID,
        locationLogID: locationInsert.insertId,
        safeZoneID: safeZone.safeZoneID,
        safeZoneName: safeZone.zoneName,
        isInsideSafeZone: insideSafeZone,
        distanceFromCenterMeters: Math.round(distance),
        violationID
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Update location error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to update location',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

const getAllLatestLocations = async (req, res) => {
  try {
    await escalatePendingAlerts();

    const [rows] = await db.query(`
      SELECT
        ll.id,
        ll.studentID,
        s.name AS studentName,
        ll.latitude,
        ll.longitude,
        ll.timestamp,
        ll.isInsideSafeZone,
        sz.zoneName,
        sz.centerLatitude,
        sz.centerLongitude,
        sz.radiusMeters
      FROM location_logs ll
      JOIN (
        SELECT studentID, MAX(timestamp) AS latestTimestamp
        FROM location_logs
        GROUP BY studentID
      ) latest
        ON ll.studentID = latest.studentID
       AND ll.timestamp = latest.latestTimestamp
      JOIN students s ON s.studentID = ll.studentID
      LEFT JOIN safe_zones sz ON sz.safeZoneID = ll.safeZoneID
      ORDER BY ll.timestamp DESC
    `);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Get all latest locations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch latest locations',
      error: error.message
    });
  }
};

const createEmergencyAlert = async (req, res) => {
  try {
    const { studentID, message, location, latitude, longitude } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'message is required'
      });
    }

    let effectiveStudentID = studentID;
    if (req.user.role === 'Student') {
      effectiveStudentID = await getStudentIDForUser(req.user.userID);
      if (!effectiveStudentID) {
        return res.status(404).json({
          success: false,
          message: 'Student profile not found for this user'
        });
      }
    }

    if (!effectiveStudentID) {
      return res.status(400).json({
        success: false,
        message: 'studentID is required'
      });
    }

    const lat = latitude === undefined || latitude === null || latitude === '' ? null : Number(latitude);
    const lon = longitude === undefined || longitude === null || longitude === '' ? null : Number(longitude);

    const eventTime = new Date();

    const [result] = await db.query(
      `INSERT INTO emergency_alerts
       (studentID, message, locationText, latitude, longitude, timestamp, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [
        effectiveStudentID,
        message,
        location || null,
        Number.isFinite(lat) ? lat : null,
        Number.isFinite(lon) ? lon : null,
        toMysqlDateTime(eventTime)
      ]
    );

    console.log(`[Emergency Notification] ALERT ${result.insertId} from Student ${effectiveStudentID}: ${message}`);

    res.status(201).json({
      success: true,
      message: 'Emergency alert created',
      data: {
        alertID: result.insertId,
        studentID: effectiveStudentID,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Create emergency alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create emergency alert',
      error: error.message
    });
  }
};

const getEmergencyAlerts = async (req, res) => {
  try {
    await escalatePendingAlerts();

    const [rows] = await db.query(`
      SELECT
        ea.id,
        ea.studentID,
        s.name AS studentName,
        ea.message,
        ea.locationText,
        ea.latitude,
        ea.longitude,
        ea.timestamp,
        ea.status,
        ea.response_time_minutes,
        ea.resolvedAt
      FROM emergency_alerts ea
      JOIN students s ON s.studentID = ea.studentID
      ORDER BY ea.timestamp DESC
      LIMIT 200
    `);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Get emergency alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch emergency alerts',
      error: error.message
    });
  }
};

const resolveEmergencyAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db.query('SELECT id, status, timestamp FROM emergency_alerts WHERE id = ?', [id]);

    if (!existing.length) {
      return res.status(404).json({
        success: false,
        message: 'Emergency alert not found'
      });
    }

    const alert = existing[0];

    if (alert.status === 'resolved') {
      return res.json({
        success: true,
        message: 'Alert already resolved'
      });
    }

    const [updateResult] = await db.query(
      `UPDATE emergency_alerts
       SET
         status = 'resolved',
         resolvedAt = NOW(),
         resolvedBy = ?,
         response_time_minutes = TIMESTAMPDIFF(MINUTE, timestamp, NOW()),
         updatedAt = NOW()
       WHERE id = ?`,
      [req.user.userID, id]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message: 'Alert could not be updated'
      });
    }

    res.json({
      success: true,
      message: 'Emergency alert marked as resolved'
    });
  } catch (error) {
    console.error('Resolve emergency alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve emergency alert',
      error: error.message
    });
  }
};

const createIncidentReport = async (req, res) => {
  try {
    const { studentID, emergencyAlertID, description, action_taken } = req.body;

    if (!studentID || !description) {
      return res.status(400).json({
        success: false,
        message: 'studentID and description are required'
      });
    }

    const [result] = await db.query(
      `INSERT INTO incident_reports
       (emergencyAlertID, studentID, description, action_taken, timestamp, createdBy)
       VALUES (?, ?, ?, ?, NOW(), ?)`,
      [
        emergencyAlertID || null,
        studentID,
        description,
        action_taken || null,
        req.user.userID
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Incident report created',
      data: {
        incidentID: result.insertId
      }
    });
  } catch (error) {
    console.error('Create incident report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create incident report',
      error: error.message
    });
  }
};

const getRecentIncidents = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        ir.id,
        ir.studentID,
        s.name AS studentName,
        ir.description,
        ir.action_taken,
        ir.timestamp,
        ir.emergencyAlertID
      FROM incident_reports ir
      JOIN students s ON s.studentID = ir.studentID
      ORDER BY ir.timestamp DESC
      LIMIT 50
    `);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get recent incidents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch incidents',
      error: error.message
    });
  }
};

const getSafetyMetrics = async (req, res) => {
  try {
    await escalatePendingAlerts();

    const [[alertsRow]] = await db.query('SELECT COUNT(*) AS totalAlerts FROM emergency_alerts');

    const [[avgResponseRow]] = await db.query(`
      SELECT ROUND(AVG(response_time_minutes), 2) AS averageResponseTime
      FROM emergency_alerts
      WHERE response_time_minutes IS NOT NULL
    `);

    const [weeklyRows] = await db.query(`
      SELECT
        YEARWEEK(timestamp, 1) AS yearWeek,
        COUNT(*) AS alertCount
      FROM emergency_alerts
      GROUP BY YEARWEEK(timestamp, 1)
      ORDER BY YEARWEEK(timestamp, 1) DESC
      LIMIT 12
    `);

    res.json({
      success: true,
      data: {
        totalAlerts: alertsRow.totalAlerts || 0,
        averageResponseTimeMinutes: avgResponseRow.averageResponseTime || 0,
        alertsPerWeek: weeklyRows
      }
    });
  } catch (error) {
    console.error('Get safety metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch safety metrics',
      error: error.message
    });
  }
};

const getHighRiskAreas = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        ROUND(latitude, 3) AS latitudeCluster,
        ROUND(longitude, 3) AS longitudeCluster,
        COUNT(*) AS violationCount
      FROM safety_violations
      GROUP BY ROUND(latitude, 3), ROUND(longitude, 3)
      ORDER BY violationCount DESC
      LIMIT 25
    `);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get high-risk areas error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch high-risk areas',
      error: error.message
    });
  }
};

const getIncidentTrends = async (req, res) => {
  try {
    const days = Number(req.query.days) || 30;

    const [rows] = await db.query(`
      SELECT
        DATE(timestamp) AS incidentDate,
        COUNT(*) AS incidentCount
      FROM incident_reports
      WHERE timestamp >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(timestamp)
      ORDER BY incidentDate ASC
    `, [days]);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get incident trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch incident trends',
      error: error.message
    });
  }
};

const rowsToCsv = (rows) => {
  if (!rows.length) return '';

  const headers = Object.keys(rows[0]);
  const escapeCell = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value).replace(/"/g, '""');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str}"`;
    }
    return str;
  };

  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((key) => escapeCell(row[key])).join(','));
  }
  return lines.join('\n');
};

const exportSafetyReportsCsv = async (req, res) => {
  try {
    const type = (req.query.type || 'alerts').toLowerCase();

    let rows = [];
    let fileName = 'safety_alerts.csv';

    if (type === 'incidents') {
      [rows] = await db.query(`
        SELECT
          ir.id,
          ir.studentID,
          s.name AS studentName,
          ir.description,
          ir.action_taken,
          ir.timestamp
        FROM incident_reports ir
        JOIN students s ON s.studentID = ir.studentID
        ORDER BY ir.timestamp DESC
      `);
      fileName = 'safety_incidents.csv';
    } else {
      [rows] = await db.query(`
        SELECT
          ea.id,
          ea.studentID,
          s.name AS studentName,
          ea.message,
          ea.locationText,
          ea.latitude,
          ea.longitude,
          ea.timestamp,
          ea.status,
          ea.response_time_minutes
        FROM emergency_alerts ea
        JOIN students s ON s.studentID = ea.studentID
        ORDER BY ea.timestamp DESC
      `);
    }

    const csv = rowsToCsv(rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    return res.status(200).send(csv);
  } catch (error) {
    console.error('Export safety reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export reports',
      error: error.message
    });
  }
};

module.exports = {
  updateLocation,
  getAllLatestLocations,
  createEmergencyAlert,
  getEmergencyAlerts,
  resolveEmergencyAlert,
  createIncidentReport,
  getRecentIncidents,
  getSafetyMetrics,
  getHighRiskAreas,
  getIncidentTrends,
  exportSafetyReportsCsv
};
