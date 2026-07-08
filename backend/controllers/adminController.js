/**
 * ADMIN CONTROLLER
 * Handles admin dashboard and reporting functionality
 * TASK 3: Generate admin reports
 */

const db = require('../config/db');

/**
 * Get dashboard statistics
 * Shows total rooms, available rooms, occupied rooms, allocation count by year
 */
const getDashboardStats = async (req, res) => {
  try {
    // Get room statistics
    const [roomStats] = await db.query(`
      SELECT 
        COUNT(*) as totalRooms,
        SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) as availableRooms,
        SUM(CASE WHEN status = 'Occupied' THEN 1 ELSE 0 END) as occupiedRooms,
        SUM(CASE WHEN status = 'Maintenance' THEN 1 ELSE 0 END) as maintenanceRooms,
        SUM(CASE WHEN type = 'Single' THEN 1 ELSE 0 END) as singleRooms,
        SUM(CASE WHEN type = 'Double' THEN 1 ELSE 0 END) as doubleRooms
      FROM rooms
    `);

    // Get allocation count by year
    const [allocationByYear] = await db.query(`
      SELECT 
        s.year,
        COUNT(ra.allocationID) as totalAllocations,
        SUM(CASE WHEN ra.status = 'Active' THEN 1 ELSE 0 END) as activeAllocations
      FROM students s
      LEFT JOIN room_allocations ra ON s.studentID = ra.studentID
      GROUP BY s.year
      ORDER BY FIELD(s.year, 'Final', 'Third', 'Second', 'First')
    `);

    // Get total students
    const [studentCount] = await db.query('SELECT COUNT(*) as totalStudents FROM students');

    // Get recent allocations
    const [recentAllocations] = await db.query(`
      SELECT 
        ra.allocationID,
        s.name as studentName,
        s.year,
        r.roomNumber,
        r.type,
        ra.allocatedDate,
        ra.status
      FROM room_allocations ra
      JOIN students s ON ra.studentID = s.studentID
      JOIN rooms r ON ra.roomID = r.roomID
      ORDER BY ra.allocatedDate DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        roomStatistics: roomStats[0],
        allocationByYear,
        studentCount: studentCount[0].totalStudents,
        recentAllocations
      }
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
};

/**
 * Get all allocations (for Admin/Warden)
 */
const getAllAllocations = async (req, res) => {
  try {
    const { status, year } = req.query;

    let query = `
      SELECT 
        ra.allocationID,
        ra.allocatedDate,
        ra.releaseDate,
        ra.status,
        s.studentID,
        s.name as studentName,
        s.year,
        u.email,
        r.roomID,
        r.roomNumber,
        r.type,
        r.hostelBlock,
        r.floor
      FROM room_allocations ra
      JOIN students s ON ra.studentID = s.studentID
      JOIN users u ON s.userID = u.userID
      JOIN rooms r ON ra.roomID = r.roomID
      WHERE 1=1
    `;
    
    const params = [];

    if (status) {
      query += ' AND ra.status = ?';
      params.push(status);
    }

    if (year) {
      query += ' AND s.year = ?';
      params.push(year);
    }

    query += ' ORDER BY ra.allocatedDate DESC';

    const [allocations] = await db.query(query, params);

    res.json({
      success: true,
      data: allocations,
      count: allocations.length
    });

  } catch (error) {
    console.error('Get all allocations error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch allocations',
      error: error.message
    });
  }
};

/**
 * Get all students (for Admin/Warden)
 */
const getAllStudents = async (req, res) => {
  try {
    const { year } = req.query;

    let query = `
      SELECT 
        s.studentID,
        s.regNo,
        s.hostelID,
        s.isExService,
        s.isCurrentStaff,
        s.hostelFee,
        s.name,
        s.year,
        s.department,
        s.phoneNumber,
        s.guardianContact,
        u.email,
        u.role,
        u.createdAt,
        CASE 
          WHEN ra.allocationID IS NOT NULL THEN 'Allocated'
          ELSE 'Not Allocated'
        END as allocationStatus,
        r.roomNumber
      FROM students s
      JOIN users u ON s.userID = u.userID
      LEFT JOIN room_allocations ra ON s.studentID = ra.studentID AND ra.status = 'Active'
      LEFT JOIN rooms r ON ra.roomID = r.roomID
      WHERE 1=1
    `;
    
    const params = [];

    if (year) {
      query += ' AND s.year = ?';
      params.push(year);
    }

    query += ' ORDER BY s.year, s.name';

    const [students] = await db.query(query, params);

    res.json({
      success: true,
      data: students,
      count: students.length
    });

  } catch (error) {
    console.error('Get all students error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students',
      error: error.message
    });
  }
};

/**
 * Assign hostel ID to a student (Admin only)
 */
const assignHostel = async (req, res) => {
  try {
    const { studentID, hostelID } = req.body;

    if (!studentID) {
      return res.status(400).json({
        success: false,
        message: 'studentID is required'
      });
    }

    if (!hostelID || !String(hostelID).trim()) {
      return res.status(400).json({
        success: false,
        message: 'hostelID is required'
      });
    }

    const [students] = await db.query(
      'SELECT studentID, hostelID, name FROM students WHERE studentID = ? LIMIT 1',
      [studentID]
    );

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const student = students[0];
    if (student.hostelID && String(student.hostelID).trim()) {
      return res.status(409).json({
        success: false,
        message: 'Hostel ID is already assigned for this student'
      });
    }

    const normalizedHostelID = String(hostelID).trim();

    await db.query(
      'UPDATE students SET hostelID = ? WHERE studentID = ?',
      [normalizedHostelID, studentID]
    );

    return res.json({
      success: true,
      message: 'Hostel ID assigned successfully',
      data: {
        studentID: Number(studentID),
        studentName: student.name,
        hostelID: normalizedHostelID
      }
    });
  } catch (error) {
    console.error('Assign hostel error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to assign hostel ID',
      error: error.message
    });
  }
};

/**
 * Get unauthorized access logs
 */
const getUnauthorizedLogs = async (req, res) => {
  try {
    const [logs] = await db.query(`
      SELECT 
        l.logID,
        l.userID,
        u.email,
        u.role,
        l.endpoint,
        l.ipAddress,
        l.attemptTime,
        l.reason
      FROM unauthorized_access_logs l
      LEFT JOIN users u ON l.userID = u.userID
      ORDER BY l.attemptTime DESC
      LIMIT 100
    `);

    res.json({
      success: true,
      data: logs,
      count: logs.length
    });

  } catch (error) {
    console.error('Get unauthorized logs error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch logs',
      error: error.message
    });
  }
};

/**
 * Get allocation logs (performance monitoring)
 */
const getAllocationLogs = async (req, res) => {
  try {
    const [logs] = await db.query(`
      SELECT 
        l.logID,
        s.name as studentName,
        s.year,
        r.roomNumber,
        l.processingTime,
        l.success,
        l.message,
        l.timestamp
      FROM allocation_logs l
      JOIN students s ON l.studentID = s.studentID
      LEFT JOIN rooms r ON l.roomID = r.roomID
      ORDER BY l.timestamp DESC
      LIMIT 100
    `);

    // Calculate average processing time
    const [avgTime] = await db.query(`
      SELECT AVG(processingTime) as avgProcessingTime
      FROM allocation_logs
      WHERE success = TRUE
    `);

    res.json({
      success: true,
      data: logs,
      count: logs.length,
      averageProcessingTime: avgTime[0].avgProcessingTime
    });

  } catch (error) {
    console.error('Get allocation logs error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch allocation logs',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardStats,
  getAllAllocations,
  getAllStudents,
  assignHostel,
  getUnauthorizedLogs,
  getAllocationLogs
};
