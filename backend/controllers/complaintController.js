    const db = require('../config/db');

    const ALLOWED_CATEGORIES = ['Electricity', 'Water', 'Cleanliness', 'Food Issue', 'Safety', 'Health'];
    const CRITICAL_CATEGORY_ADMIN_MAP = {
      'Food Issue': 'Food Admin Desk',
      'Safety': 'Safety Admin Desk',
      'Health': 'Health Admin Desk'
    };

    const getCriticalAdminDesk = (category) => CRITICAL_CATEGORY_ADMIN_MAP[category] || null;

    const ensureComplaintCategorySchema = async (connectionOrDb = db) => {
      await connectionOrDb.query(`
        ALTER TABLE complaints
        MODIFY COLUMN category ENUM(
          'Electricity',
          'Water',
          'Cleanliness',
          'Food Issue',
          'Safety',
          'Health'
        ) NOT NULL
      `);
    };

    // Raise a complaint (Student)
    const raiseComplaint = async (req, res) => {
      try {
        await ensureComplaintCategorySchema();

        const { roomID, category, description, urgency } = req.body;
        const studentID = req.user.studentID; // requireStudent middleware must set this

        if (!roomID || !category) {
          return res.status(400).json({ success: false, message: 'roomID and category are required' });
        }

        if (!ALLOWED_CATEGORIES.includes(category)) {
          return res.status(400).json({
            success: false,
            message: `Invalid complaint category. Allowed: ${ALLOWED_CATEGORIES.join(', ')}`
          });
        }

        const allowedUrgency = ['Low', 'Medium', 'High', 'Critical'];
        const u = urgency && allowedUrgency.includes(urgency) ? urgency : 'Medium';

        // Simple priority score mapping (base). More advanced scoring (year, history) can be added later.
        const urgencyScoreMap = { Low: 1, Medium: 2, High: 3, Critical: 4 };
        const priorityScore = urgencyScoreMap[u] || 2;

        const assignedCriticalDesk = getCriticalAdminDesk(category);
        const initialStatus = assignedCriticalDesk ? 'In Progress' : 'Open';

        const [result] = await db.query(
          'INSERT INTO complaints (studentID, roomID, category, description, urgency, priorityScore, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [studentID, roomID, category, description || null, u, priorityScore, initialStatus]
        );

        if (assignedCriticalDesk) {
          await db.query(
            'INSERT INTO maintenance_logs (complaintID, assignedBy, assignedTo, remarks, status) VALUES (?, ?, ?, ?, ?)',
            [result.insertId, null, assignedCriticalDesk, 'Auto-routed critical complaint', 'In Progress']
          );
        }

        res.status(201).json({
          success: true,
          message: assignedCriticalDesk
            ? `Complaint raised and routed to ${assignedCriticalDesk}`
            : 'Complaint raised',
          complaintID: result.insertId,
          handler: assignedCriticalDesk || 'Maintenance/Admin Staff'
        });
      } catch (error) {
        console.error('Raise complaint error:', error);
        res.status(500).json({ success: false, message: 'Failed to raise complaint', error: error.message });
      }
    };

    // Get complaints for current student
    const getStudentComplaints = async (req, res) => {
      try {
        const studentID = req.user.studentID;
        const [complaints] = await db.query(
          `SELECT c.*, r.roomNumber, r.hostelBlock,
                  CASE
                    WHEN c.category = 'Food Issue' THEN 'Food Admin Desk'
                    WHEN c.category = 'Safety' THEN 'Safety Admin Desk'
                    WHEN c.category = 'Health' THEN 'Health Admin Desk'
                    ELSE 'Maintenance/Admin Staff'
                  END AS handlingDesk
            FROM complaints c
            JOIN rooms r ON c.roomID = r.roomID
            WHERE c.studentID = ?
            ORDER BY
              CASE
                WHEN c.priorityScore > 0 THEN c.priorityScore
                WHEN c.urgency = 'Critical' THEN 4
                WHEN c.urgency = 'High' THEN 3
                WHEN c.urgency = 'Medium' THEN 2
                WHEN c.urgency = 'Low' THEN 1
                ELSE 0
              END DESC,
              c.createdAt DESC`,
          [studentID]
        );

        res.json({ success: true, data: complaints });
      } catch (error) {
        console.error('Get student complaints error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch complaints', error: error.message });
      }
    };

    // Get all complaints (Admin/Warden)
    const getAllComplaints = async (req, res) => {
      try {
        const params = [];
        const whereParts = [];

        if (req.user?.role === 'Admin' && req.user?.specializedCategory) {
          whereParts.push('c.category = ?');
          params.push(req.user.specializedCategory);
        }

        if (req.query?.category) {
          whereParts.push('c.category = ?');
          params.push(req.query.category);
        }

        const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

        const [rows] = await db.query(
          `SELECT c.*, s.name AS studentName, u.email AS studentEmail, r.roomNumber,
                  CASE
                    WHEN c.category = 'Food Issue' THEN 'Food Admin Desk'
                    WHEN c.category = 'Safety' THEN 'Safety Admin Desk'
                    WHEN c.category = 'Health' THEN 'Health Admin Desk'
                    ELSE 'Maintenance/Admin Staff'
                  END AS handlingDesk
            FROM complaints c
            JOIN students s ON c.studentID = s.studentID
            JOIN users u ON s.userID = u.userID
            JOIN rooms r ON c.roomID = r.roomID
            ${whereClause}
            ORDER BY
              CASE
                WHEN c.priorityScore > 0 THEN c.priorityScore
                WHEN c.urgency = 'Critical' THEN 4
                WHEN c.urgency = 'High' THEN 3
                WHEN c.urgency = 'Medium' THEN 2
                WHEN c.urgency = 'Low' THEN 1
                ELSE 0
              END DESC,
              c.status ASC,
              c.createdAt DESC`,
          params
        );

        res.json({ success: true, data: rows });
      } catch (error) {
        console.error('Get all complaints error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch complaints', error: error.message });
      }
    };

    // Assign maintenance to a complaint (Warden/Admin)
    const assignMaintenance = async (req, res) => {
      const connection = await db.getConnection();
      try {
        const { id } = req.params;
        const { assignedTo, remarks } = req.body;
        const assignedBy = req.user.userID;

        const [complaintRows] = await connection.query(
          'SELECT category FROM complaints WHERE complaintID = ? LIMIT 1',
          [id]
        );

        if (!complaintRows.length) {
          return res.status(404).json({ success: false, message: 'Complaint not found' });
        }

        const complaintCategory = complaintRows[0].category;

        if (req.user?.role === 'Admin' && req.user?.specializedCategory && req.user.specializedCategory !== complaintCategory) {
          return res.status(403).json({
            success: false,
            message: `Access denied. You can only manage ${req.user.specializedCategory} complaints.`
          });
        }

        const autoDesk = getCriticalAdminDesk(complaintCategory);
        const finalAssignedTo = assignedTo || autoDesk;

        if (!finalAssignedTo) {
          return res.status(400).json({ success: false, message: 'assignedTo is required' });
        }

        await connection.beginTransaction();

        // Update complaint status
        await connection.query('UPDATE complaints SET status = ? WHERE complaintID = ?', ['In Progress', id]);

        // Insert maintenance log
        await connection.query(
          'INSERT INTO maintenance_logs (complaintID, assignedBy, assignedTo, remarks, status) VALUES (?, ?, ?, ?, ?)',
          [id, assignedBy, finalAssignedTo, remarks || null, 'In Progress']
        );

        await connection.commit();

        res.json({ success: true, message: 'Maintenance assigned' });
      } catch (error) {
        await connection.rollback();
        console.error('Assign maintenance error:', error);
        res.status(500).json({ success: false, message: 'Failed to assign maintenance', error: error.message });
      } finally {
        connection.release();
      }
    };

    // Resolve complaint
    const resolveComplaint = async (req, res) => {
      const connection = await db.getConnection();
      try {
        const { id } = req.params;
        const { remarks } = req.body;
        const userID = req.user.userID;

        await connection.beginTransaction();

        // Update complaint status
        await connection.query('UPDATE complaints SET status = ? WHERE complaintID = ?', ['Resolved', id]);

        // Insert maintenance log entry marking resolved
        await connection.query(
          'INSERT INTO maintenance_logs (complaintID, assignedBy, assignedTo, remarks, status) VALUES (?, ?, ?, ?, ?)',
          [id, userID, null, remarks || 'Resolved by staff', 'Resolved']
        );

        await connection.commit();

        res.json({ success: true, message: 'Complaint marked as resolved' });
      } catch (error) {
        await connection.rollback();
        console.error('Resolve complaint error:', error);
        res.status(500).json({ success: false, message: 'Failed to resolve complaint', error: error.message });
      } finally {
        connection.release();
      }
    };

    module.exports = {
      raiseComplaint,
      getStudentComplaints,
      getAllComplaints,
      assignMaintenance,
      resolveComplaint
    };
