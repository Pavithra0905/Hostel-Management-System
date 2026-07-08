const db = require('../config/db');

const ensureLeaveSchema = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS student_leave_requests (
      leaveID INT AUTO_INCREMENT PRIMARY KEY,
      studentID INT NOT NULL,
      fromDate DATE NOT NULL,
      toDate DATE NOT NULL,
      totalDays INT NOT NULL,
      reason VARCHAR(500) NULL,
      status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
      adminRemarks VARCHAR(500) NULL,
      approvedBy INT NULL,
      approvedAt DATETIME NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (studentID) REFERENCES students(studentID) ON DELETE CASCADE,
      FOREIGN KEY (approvedBy) REFERENCES users(userID) ON DELETE SET NULL,
      INDEX idx_leave_student_status (studentID, status),
      INDEX idx_leave_date_range (fromDate, toDate),
      INDEX idx_leave_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
};

const daysBetweenInclusive = (fromDate, toDate) => {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((to.getTime() - from.getTime()) / millisecondsPerDay) + 1;
};

const applyLeave = async (req, res) => {
  try {
    await ensureLeaveSchema();

    const studentID = req.user.studentID;
    const { fromDate, toDate, reason } = req.body;

    if (!fromDate || !toDate) {
      return res.status(400).json({ success: false, message: 'fromDate and toDate are required' });
    }

    if (new Date(toDate) < new Date(fromDate)) {
      return res.status(400).json({ success: false, message: 'toDate must be on or after fromDate' });
    }

    const totalDays = daysBetweenInclusive(fromDate, toDate);

    const [result] = await db.query(
      `INSERT INTO student_leave_requests
       (studentID, fromDate, toDate, totalDays, reason, status)
       VALUES (?, ?, ?, ?, ?, 'Pending')`,
      [studentID, fromDate, toDate, totalDays, reason || null]
    );

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data: {
        leaveID: result.insertId,
        studentID,
        fromDate,
        toDate,
        totalDays,
        reason: reason || null,
        status: 'Pending'
      }
    });
  } catch (error) {
    console.error('Apply leave error:', error);
    res.status(500).json({ success: false, message: 'Failed to apply leave', error: error.message });
  }
};

const getMyLeaves = async (req, res) => {
  try {
    await ensureLeaveSchema();

    const studentID = req.user.studentID;
    const [leaves] = await db.query(
      `SELECT leaveID, studentID, fromDate, toDate, totalDays, reason, status, adminRemarks, approvedBy, approvedAt, createdAt, updatedAt
       FROM student_leave_requests
       WHERE studentID = ?
       ORDER BY createdAt DESC, leaveID DESC`,
      [studentID]
    );

    res.json({ success: true, data: leaves, count: leaves.length });
  } catch (error) {
    console.error('Get my leaves error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch leaves', error: error.message });
  }
};

const getAllLeaves = async (req, res) => {
  try {
    await ensureLeaveSchema();

    const { status } = req.query;

    let query = `
      SELECT
        lr.leaveID,
        lr.studentID,
        s.name AS studentName,
        s.regNo,
        u.email,
        lr.fromDate,
        lr.toDate,
        lr.totalDays,
        lr.reason,
        lr.status,
        lr.adminRemarks,
        lr.approvedBy,
        lr.approvedAt,
        lr.createdAt,
        lr.updatedAt
      FROM student_leave_requests lr
      JOIN students s ON lr.studentID = s.studentID
      JOIN users u ON s.userID = u.userID
      WHERE 1=1
    `;

    const params = [];
    if (status) {
      query += ' AND lr.status = ?';
      params.push(status);
    }

    query += ' ORDER BY lr.createdAt DESC, lr.leaveID DESC';

    const [leaves] = await db.query(query, params);
    res.json({ success: true, data: leaves, count: leaves.length });
  } catch (error) {
    console.error('Get all leaves error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch leaves', error: error.message });
  }
};

const updateLeaveStatus = async (req, res) => {
  try {
    await ensureLeaveSchema();

    const { leaveID } = req.params;
    const { status, adminRemarks } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: "status must be 'Approved' or 'Rejected'" });
    }

    const [existing] = await db.query('SELECT leaveID, status FROM student_leave_requests WHERE leaveID = ?', [leaveID]);
    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    if (existing[0].status !== 'Pending') {
      return res.status(409).json({ success: false, message: 'Only pending requests can be updated' });
    }

    await db.query(
      `UPDATE student_leave_requests
       SET status = ?, adminRemarks = ?, approvedBy = ?, approvedAt = NOW(), updatedAt = NOW()
       WHERE leaveID = ?`,
      [status, adminRemarks || null, req.user.userID, leaveID]
    );

    res.json({ success: true, message: `Leave request ${status.toLowerCase()} successfully` });
  } catch (error) {
    console.error('Update leave status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update leave status', error: error.message });
  }
};

module.exports = {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  updateLeaveStatus,
  ensureLeaveSchema
};
