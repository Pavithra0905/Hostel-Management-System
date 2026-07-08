const db = require('../config/db');

const ensureFinesTable = async (connectionOrDb = db) => {
  await connectionOrDb.query(`
    CREATE TABLE IF NOT EXISTS fines (
      fineID INT AUTO_INCREMENT PRIMARY KEY,
      studentID INT NOT NULL,
      date DATE NOT NULL,
      hoursLate INT NOT NULL,
      fineAmount DECIMAL(10, 2) NOT NULL,
      status ENUM('Pending', 'Paid') NOT NULL DEFAULT 'Pending',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (studentID) REFERENCES students(studentID) ON DELETE CASCADE,
      INDEX idx_student (studentID),
      INDEX idx_date (date),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
};

const ensureMovementTable = async (connectionOrDb = db) => {
  await connectionOrDb.query(`
    CREATE TABLE IF NOT EXISTS student_movement_logs (
      movementID INT AUTO_INCREMENT PRIMARY KEY,
      studentID INT NOT NULL,
      outDateTime DATETIME NOT NULL,
      expectedInDateTime DATETIME NOT NULL,
      actualInDateTime DATETIME NULL,
      lateMinutes INT NOT NULL DEFAULT 0,
      hoursLate INT NOT NULL DEFAULT 0,
      fineAmount DECIMAL(10, 2) NOT NULL DEFAULT 0,
      fineGenerated TINYINT(1) NOT NULL DEFAULT 0,
      status ENUM('Out', 'Returned', 'No Report') NOT NULL DEFAULT 'Out',
      notes VARCHAR(255) NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (studentID) REFERENCES students(studentID) ON DELETE CASCADE,
      INDEX idx_student_status (studentID, status),
      INDEX idx_expected (expectedInDateTime),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
};

const minutesBetween = (futureDate, pastDate) => {
  return Math.max(0, Math.ceil((futureDate.getTime() - pastDate.getTime()) / (1000 * 60)));
};

const calculateFineFromLateMinutes = (lateMinutes, forceNoReport = false) => {
  const safeMinutes = Number(lateMinutes || 0);
  const hoursLateRounded = Math.max(1, Math.ceil(safeMinutes / 60));

  if (forceNoReport || safeMinutes > 180) {
    return {
      fineAmount: 5000,
      hoursLate: Math.max(4, hoursLateRounded),
      category: 'No Report'
    };
  }

  if (safeMinutes <= 60) {
    return { fineAmount: 100, hoursLate: 1, category: 'Late Return' };
  }

  if (safeMinutes <= 120) {
    return { fineAmount: 500, hoursLate: 2, category: 'Late Return' };
  }

  return { fineAmount: 1000, hoursLate: 3, category: 'Late Return' };
};

const calculateFineAmount = (hoursLate) => {
  const lateHours = Number(hoursLate);

  if (!Number.isInteger(lateHours) || lateHours <= 0) {
    return {
      valid: false,
      message: 'hoursLate must be a positive integer'
    };
  }

  if (lateHours > 3) {
    return { valid: true, fineAmount: 5000, lateHours, category: 'No Report' };
  }

  const fineMap = {
    1: 100,
    2: 500,
    3: 1000
  };

  return {
    valid: true,
    fineAmount: fineMap[lateHours] || 5000,
    lateHours,
    category: 'Late Return'
  };
};

const resolveStudentByUserID = async (userID) => {
  const [students] = await db.query(
    'SELECT studentID, name, regNo FROM students WHERE userID = ? LIMIT 1',
    [userID]
  );

  return students.length > 0 ? students[0] : null;
};

const createFine = async (req, res) => {
  try {
    await ensureFinesTable();
    await ensureMovementTable();

    const { studentID, hoursLate } = req.body;

    if (!studentID) {
      return res.status(400).json({ success: false, message: 'studentID is required' });
    }

    const fineResult = calculateFineAmount(hoursLate);
    if (!fineResult.valid) {
      return res.status(400).json({ success: false, message: fineResult.message });
    }

    const [students] = await db.query(
      `SELECT s.studentID, s.name, s.regNo, u.email
       FROM students s
       JOIN users u ON s.userID = u.userID
       WHERE s.studentID = ?
       LIMIT 1`,
      [studentID]
    );

    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const student = students[0];
    const fineDate = new Date().toISOString().split('T')[0];

    const [insertResult] = await db.query(
      'INSERT INTO fines (studentID, date, hoursLate, fineAmount, status) VALUES (?, ?, ?, ?, ?)',
      [studentID, fineDate, fineResult.lateHours, fineResult.fineAmount, 'Pending']
    );

    res.status(201).json({
      success: true,
      message: 'Fine created successfully',
      data: {
        fineID: insertResult.insertId,
        studentID: Number(studentID),
        studentName: student.name,
        regNo: student.regNo,
        email: student.email,
        date: fineDate,
        hoursLate: fineResult.lateHours,
        fineAmount: fineResult.fineAmount,
        status: 'Pending',
        category: fineResult.category
      }
    });
  } catch (error) {
    console.error('Create fine error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create fine',
      error: error.message
    });
  }
};

const reportOutTime = async (req, res) => {
  try {
    await ensureMovementTable();

    const student = await resolveStudentByUserID(req.user.userID);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const { expectedInDateTime, notes } = req.body;
    if (!expectedInDateTime) {
      return res.status(400).json({ success: false, message: 'expectedInDateTime is required' });
    }

    const expected = new Date(expectedInDateTime);
    if (Number.isNaN(expected.getTime())) {
      return res.status(400).json({ success: false, message: 'expectedInDateTime must be a valid datetime' });
    }

    const outDateTime = new Date();
    if (expected <= outDateTime) {
      return res.status(400).json({ success: false, message: 'expectedInDateTime must be in the future' });
    }

    const [openRows] = await db.query(
      'SELECT movementID FROM student_movement_logs WHERE studentID = ? AND status = ? LIMIT 1',
      [student.studentID, 'Out']
    );

    if (openRows.length > 0) {
      return res.status(409).json({ success: false, message: 'You already have an active out-entry. Report in first.' });
    }

    const [result] = await db.query(
      `INSERT INTO student_movement_logs
        (studentID, outDateTime, expectedInDateTime, status, notes)
       VALUES (?, ?, ?, 'Out', ?)`,
      [student.studentID, outDateTime, expected, notes || null]
    );

    res.status(201).json({
      success: true,
      message: 'Out time reported successfully',
      data: {
        movementID: result.insertId,
        studentID: student.studentID,
        outDateTime,
        expectedInDateTime: expected,
        status: 'Out'
      }
    });
  } catch (error) {
    console.error('Report out-time error:', error);
    res.status(500).json({ success: false, message: 'Failed to report out time', error: error.message });
  }
};

const reportInTime = async (req, res) => {
  try {
    await ensureFinesTable();
    await ensureMovementTable();

    const student = await resolveStudentByUserID(req.user.userID);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const { movementID, actualInDateTime } = req.body;
    const actualIn = actualInDateTime ? new Date(actualInDateTime) : new Date();
    if (Number.isNaN(actualIn.getTime())) {
      return res.status(400).json({ success: false, message: 'actualInDateTime must be a valid datetime' });
    }

    const query = movementID
      ? `SELECT movementID, studentID, outDateTime, expectedInDateTime, status, fineGenerated
         FROM student_movement_logs
         WHERE movementID = ? AND studentID = ?
         LIMIT 1`
      : `SELECT movementID, studentID, outDateTime, expectedInDateTime, status, fineGenerated
         FROM student_movement_logs
         WHERE studentID = ? AND status = 'Out'
         ORDER BY outDateTime DESC
         LIMIT 1`;
    const params = movementID ? [movementID, student.studentID] : [student.studentID];
    const [rows] = await db.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No active out-entry found to report in' });
    }

    const movement = rows[0];
    if (movement.status !== 'Out') {
      return res.status(409).json({ success: false, message: 'This movement entry is already closed' });
    }

    const expectedIn = new Date(movement.expectedInDateTime);
    const lateMinutes = minutesBetween(actualIn, expectedIn);

    if (lateMinutes <= 0) {
      await db.query(
        `UPDATE student_movement_logs
         SET actualInDateTime = ?, lateMinutes = 0, hoursLate = 0, fineAmount = 0, fineGenerated = 0, status = 'Returned'
         WHERE movementID = ?`,
        [actualIn, movement.movementID]
      );

      return res.json({
        success: true,
        message: 'In time reported. No fine applied.',
        data: {
          movementID: movement.movementID,
          status: 'Returned',
          lateMinutes: 0,
          fineAmount: 0
        }
      });
    }

    const slab = calculateFineFromLateMinutes(lateMinutes, false);
    const fineDate = actualIn.toISOString().split('T')[0];

    if (!movement.fineGenerated) {
      await db.query(
        'INSERT INTO fines (studentID, date, hoursLate, fineAmount, status) VALUES (?, ?, ?, ?, ?)',
        [student.studentID, fineDate, slab.hoursLate, slab.fineAmount, 'Pending']
      );
    }

    await db.query(
      `UPDATE student_movement_logs
       SET actualInDateTime = ?, lateMinutes = ?, hoursLate = ?, fineAmount = ?, fineGenerated = 1, status = 'Returned'
       WHERE movementID = ?`,
      [actualIn, lateMinutes, slab.hoursLate, slab.fineAmount, movement.movementID]
    );

    res.json({
      success: true,
      message: 'In time reported and fine applied',
      data: {
        movementID: movement.movementID,
        status: 'Returned',
        lateMinutes,
        hoursLate: slab.hoursLate,
        fineAmount: slab.fineAmount,
        category: slab.category
      }
    });
  } catch (error) {
    console.error('Report in-time error:', error);
    res.status(500).json({ success: false, message: 'Failed to report in time', error: error.message });
  }
};

const processNoReportFines = async (req, res) => {
  try {
    await ensureFinesTable();
    await ensureMovementTable();

    const now = new Date();
    const cutoffHours = Number(req.body?.cutoffHours || 3);
    if (!Number.isInteger(cutoffHours) || cutoffHours < 1) {
      return res.status(400).json({ success: false, message: 'cutoffHours must be a positive integer' });
    }

    const [openMovements] = await db.query(
      `SELECT movementID, studentID, expectedInDateTime
       FROM student_movement_logs
       WHERE status = 'Out'`
    );

    let processedCount = 0;
    for (const movement of openMovements) {
      const expectedIn = new Date(movement.expectedInDateTime);
      const lateMinutes = minutesBetween(now, expectedIn);

      if (lateMinutes <= cutoffHours * 60) {
        continue;
      }

      const slab = calculateFineFromLateMinutes(lateMinutes, true);
      const fineDate = now.toISOString().split('T')[0];

      await db.query(
        'INSERT INTO fines (studentID, date, hoursLate, fineAmount, status) VALUES (?, ?, ?, ?, ?)',
        [movement.studentID, fineDate, slab.hoursLate, slab.fineAmount, 'Pending']
      );

      await db.query(
        `UPDATE student_movement_logs
         SET status = 'No Report', lateMinutes = ?, hoursLate = ?, fineAmount = ?, fineGenerated = 1
         WHERE movementID = ?`,
        [lateMinutes, slab.hoursLate, slab.fineAmount, movement.movementID]
      );

      processedCount += 1;
    }

    res.json({
      success: true,
      message: 'No-report fine processing completed',
      data: {
        cutoffHours,
        processedCount,
        fineRule: {
          oneHour: 100,
          twoHours: 500,
          threeHours: 1000,
          beyondThreeHoursOrNoReport: 2000
        }
      }
    });
  } catch (error) {
    console.error('Process no-report fines error:', error);
    res.status(500).json({ success: false, message: 'Failed to process no-report fines', error: error.message });
  }
};

const getMyMovements = async (req, res) => {
  try {
    await ensureMovementTable();

    const student = await resolveStudentByUserID(req.user.userID);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const [movements] = await db.query(
      `SELECT movementID, studentID, outDateTime, expectedInDateTime, actualInDateTime, lateMinutes, hoursLate, fineAmount, fineGenerated, status, notes, createdAt, updatedAt
       FROM student_movement_logs
       WHERE studentID = ?
       ORDER BY outDateTime DESC, movementID DESC`,
      [student.studentID]
    );

    res.json({ success: true, data: movements, count: movements.length });
  } catch (error) {
    console.error('Get my movements error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch movement logs', error: error.message });
  }
};

const getAllMovements = async (req, res) => {
  try {
    await ensureMovementTable();

    const [movements] = await db.query(
      `SELECT
        sml.movementID,
        sml.studentID,
        s.name AS studentName,
        s.regNo,
        sml.outDateTime,
        sml.expectedInDateTime,
        sml.actualInDateTime,
        sml.lateMinutes,
        sml.hoursLate,
        sml.fineAmount,
        sml.fineGenerated,
        sml.status,
        sml.notes,
        sml.createdAt,
        sml.updatedAt
       FROM student_movement_logs sml
       JOIN students s ON sml.studentID = s.studentID
       ORDER BY sml.outDateTime DESC, sml.movementID DESC`
    );

    res.json({ success: true, data: movements, count: movements.length });
  } catch (error) {
    console.error('Get all movements error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch all movement logs', error: error.message });
  }
};

const getAllFines = async (req, res) => {
  try {
    await ensureFinesTable();

    const [fines] = await db.query(`
      SELECT
        f.fineID,
        f.studentID,
        s.name AS studentName,
        s.regNo,
        u.email,
        f.date,
        f.hoursLate,
        f.fineAmount,
        f.status,
        f.createdAt,
        f.updatedAt
      FROM fines f
      JOIN students s ON f.studentID = s.studentID
      JOIN users u ON s.userID = u.userID
      ORDER BY f.date DESC, f.fineID DESC
    `);

    const summary = fines.reduce((accumulator, fine) => {
      accumulator.totalFines += 1;
      accumulator.pendingFines += fine.status === 'Pending' ? 1 : 0;
      accumulator.paidFines += fine.status === 'Paid' ? 1 : 0;
      accumulator.totalPendingAmount += fine.status === 'Pending' ? Number(fine.fineAmount) : 0;
      accumulator.totalCollectedAmount += fine.status === 'Paid' ? Number(fine.fineAmount) : 0;
      return accumulator;
    }, {
      totalFines: 0,
      pendingFines: 0,
      paidFines: 0,
      totalPendingAmount: 0,
      totalCollectedAmount: 0
    });

    res.json({
      success: true,
      data: fines,
      summary,
      count: fines.length
    });
  } catch (error) {
    console.error('Get all fines error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fines',
      error: error.message
    });
  }
};

const getMyFines = async (req, res) => {
  try {
    await ensureFinesTable();

    const student = await resolveStudentByUserID(req.user.userID);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const [fines] = await db.query(
      `SELECT
        fineID,
        studentID,
        date,
        hoursLate,
        fineAmount,
        status,
        createdAt,
        updatedAt
      FROM fines
      WHERE studentID = ?
      ORDER BY date DESC, fineID DESC`,
      [student.studentID]
    );

    const summary = fines.reduce((accumulator, fine) => {
      accumulator.totalFines += 1;
      accumulator.pendingFines += fine.status === 'Pending' ? 1 : 0;
      accumulator.paidFines += fine.status === 'Paid' ? 1 : 0;
      accumulator.totalPendingAmount += fine.status === 'Pending' ? Number(fine.fineAmount) : 0;
      accumulator.totalFineAmount += Number(fine.fineAmount);
      return accumulator;
    }, {
      totalFines: 0,
      pendingFines: 0,
      paidFines: 0,
      totalPendingAmount: 0,
      totalFineAmount: 0
    });

    res.json({
      success: true,
      data: {
        student,
        fines,
        summary
      }
    });
  } catch (error) {
    console.error('Get my fines error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your fines',
      error: error.message
    });
  }
};

const getStudentFines = async (req, res) => {
  try {
    await ensureFinesTable();

    const { studentID } = req.params;
    if (!studentID) {
      return res.status(400).json({ success: false, message: 'studentID is required' });
    }

    const [fines] = await db.query(
      `SELECT
        f.fineID,
        f.studentID,
        s.name AS studentName,
        s.regNo,
        u.email,
        f.date,
        f.hoursLate,
        f.fineAmount,
        f.status,
        f.createdAt,
        f.updatedAt
      FROM fines f
      JOIN students s ON f.studentID = s.studentID
      JOIN users u ON s.userID = u.userID
      WHERE f.studentID = ?
      ORDER BY f.date DESC, f.fineID DESC`,
      [studentID]
    );

    const summary = fines.reduce((accumulator, fine) => {
      accumulator.totalFines += 1;
      accumulator.pendingFines += fine.status === 'Pending' ? 1 : 0;
      accumulator.paidFines += fine.status === 'Paid' ? 1 : 0;
      accumulator.totalPendingAmount += fine.status === 'Pending' ? Number(fine.fineAmount) : 0;
      accumulator.totalFineAmount += Number(fine.fineAmount);
      return accumulator;
    }, {
      totalFines: 0,
      pendingFines: 0,
      paidFines: 0,
      totalPendingAmount: 0,
      totalFineAmount: 0
    });

    res.json({
      success: true,
      data: fines,
      summary,
      count: fines.length
    });
  } catch (error) {
    console.error('Get student fines error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student fines',
      error: error.message
    });
  }
};

const markFinePaid = async (req, res) => {
  try {
    await ensureFinesTable();

    const { fineID } = req.params;
    if (!fineID) {
      return res.status(400).json({ success: false, message: 'fineID is required' });
    }

    const [fines] = await db.query(
      `SELECT f.fineID, f.studentID, f.date, f.hoursLate, f.fineAmount, f.status, s.name AS studentName, s.regNo
       FROM fines f
       JOIN students s ON f.studentID = s.studentID
       WHERE f.fineID = ?
       LIMIT 1`,
      [fineID]
    );

    if (fines.length === 0) {
      return res.status(404).json({ success: false, message: 'Fine record not found' });
    }

    if (fines[0].status === 'Paid') {
      return res.status(409).json({ success: false, message: 'Fine is already marked as paid' });
    }

    await db.query(
      'UPDATE fines SET status = ? WHERE fineID = ?',
      ['Paid', fineID]
    );

    res.json({
      success: true,
      message: 'Fine marked as paid',
      data: {
        fineID: Number(fineID),
        studentID: fines[0].studentID,
        studentName: fines[0].studentName,
        regNo: fines[0].regNo,
        status: 'Paid'
      }
    });
  } catch (error) {
    console.error('Mark fine paid error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update fine status',
      error: error.message
    });
  }
};

module.exports = {
  createFine,
  reportOutTime,
  reportInTime,
  processNoReportFines,
  getMyMovements,
  getAllMovements,
  getAllFines,
  getMyFines,
  getStudentFines,
  markFinePaid
};
