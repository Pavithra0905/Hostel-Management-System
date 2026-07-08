/**
 * PAYMENT CONTROLLER
 * Handles payment tracking, fee management, and receipt generation
 * Features:
 * - Track payment status (Pending, Partial, Full, Overdue)
 * - Calculate fines for late payments
 * - Generate receipts
 * - Payment history logs
 */

const db = require('../config/db');
const { sendFeeReminderWhatsApp } = require('../utils/whatsappNotifier');

const DEFAULT_MESS_DAILY_RATE = 120;
const SINGLE_ROOM_FEE = 6000;
const DOUBLE_ROOM_FEE = 4000;
const PHD_ROOM_FEE = 10000;

const ensurePaymentSchema = async () => {
  await db.query(
    `ALTER TABLE students
     ADD COLUMN IF NOT EXISTS monthlyFeeAmount DECIMAL(10, 2) DEFAULT 5000.00`
  );

  await db.query(
    `CREATE TABLE IF NOT EXISTS hostel_payments (
      paymentID INT AUTO_INCREMENT PRIMARY KEY,
      studentID INT NOT NULL,
      month VARCHAR(7) NOT NULL,
      feeAmount DECIMAL(10, 2) NOT NULL,
      messDailyRate DECIMAL(10, 2) NOT NULL DEFAULT 120.00,
      leaveDaysCount INT NOT NULL DEFAULT 0,
      effectiveMessDays INT NOT NULL DEFAULT 0,
      messBillAmount DECIMAL(10, 2) NOT NULL DEFAULT 0,
      messConcessionAmount DECIMAL(10, 2) NOT NULL DEFAULT 0,
      netMessBillAmount DECIMAL(10, 2) NOT NULL DEFAULT 0,
      fineAmount DECIMAL(10, 2) DEFAULT 0,
      totalAmount DECIMAL(10, 2) NOT NULL,
      paidAmount DECIMAL(10, 2) DEFAULT 0,
      paymentStatus ENUM('Pending', 'Partial', 'Full', 'Overdue') DEFAULT 'Pending',
      paymentDueDate DATE NOT NULL,
      paymentDate TIMESTAMP NULL,
      paymentMethod ENUM('Cash', 'Online Transfer', 'Cheque', 'UPI') DEFAULT 'Online Transfer',
      receiptNumber VARCHAR(50) UNIQUE NULL,
      remarks TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (studentID) REFERENCES students(studentID) ON DELETE CASCADE,
      INDEX idx_student (studentID),
      INDEX idx_month (month),
      INDEX idx_status (paymentStatus),
      INDEX idx_dueDate (paymentDueDate),
      UNIQUE KEY unique_student_month (studentID, month)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  await db.query(
    `CREATE TABLE IF NOT EXISTS payment_history (
      historyID INT AUTO_INCREMENT PRIMARY KEY,
      paymentID INT NOT NULL,
      previousStatus ENUM('Pending', 'Partial', 'Full', 'Overdue') NOT NULL,
      newStatus ENUM('Pending', 'Partial', 'Full', 'Overdue') NOT NULL,
      amountPaid DECIMAL(10, 2) NOT NULL,
      changedBy INT NULL,
      reason TEXT,
      changedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (paymentID) REFERENCES hostel_payments(paymentID) ON DELETE CASCADE,
      FOREIGN KEY (changedBy) REFERENCES users(userID) ON DELETE SET NULL,
      INDEX idx_payment (paymentID),
      INDEX idx_changed_date (changedAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  await db.query(
    `CREATE TABLE IF NOT EXISTS student_leave_requests (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  await db.query(
    `ALTER TABLE hostel_payments
      ADD COLUMN IF NOT EXISTS messDailyRate DECIMAL(10, 2) NOT NULL DEFAULT 120.00 AFTER feeAmount,
      ADD COLUMN IF NOT EXISTS leaveDaysCount INT NOT NULL DEFAULT 0 AFTER messDailyRate,
      ADD COLUMN IF NOT EXISTS effectiveMessDays INT NOT NULL DEFAULT 0 AFTER leaveDaysCount,
      ADD COLUMN IF NOT EXISTS messBillAmount DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER effectiveMessDays,
      ADD COLUMN IF NOT EXISTS messConcessionAmount DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER messBillAmount,
      ADD COLUMN IF NOT EXISTS netMessBillAmount DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER messConcessionAmount`
  );
};

const ensureMonthPayments = async (month) => {
  await ensurePaymentSchema();
  await db.query(
    `INSERT INTO hostel_payments (
      studentID,
      month,
      feeAmount,
      messDailyRate,
      leaveDaysCount,
      effectiveMessDays,
      messBillAmount,
      messConcessionAmount,
      netMessBillAmount,
      fineAmount,
      totalAmount,
      paidAmount,
      paymentStatus,
      paymentDueDate
    )
     SELECT
       s.studentID,
       ?,
       CASE
         WHEN COALESCE(s.isExService, 0) = 1 THEN 0
         WHEN COALESCE(s.isCurrentStaff, 0) = 1 THEN (
           CASE
             WHEN COALESCE(ri.roomCategory, 'Regular') = 'PhD' THEN ${PHD_ROOM_FEE}
             WHEN ri.type = 'Single' THEN ${SINGLE_ROOM_FEE}
             WHEN ri.type = 'Double' THEN ${DOUBLE_ROOM_FEE}
             ELSE COALESCE(s.monthlyFeeAmount, 5000)
           END
         ) * 0.5
         ELSE (
           CASE
             WHEN COALESCE(ri.roomCategory, 'Regular') = 'PhD' THEN ${PHD_ROOM_FEE}
             WHEN ri.type = 'Single' THEN ${SINGLE_ROOM_FEE}
             WHEN ri.type = 'Double' THEN ${DOUBLE_ROOM_FEE}
             ELSE COALESCE(s.monthlyFeeAmount, 5000)
           END
         )
       END,
       ?,
       COALESCE(ls.approvedLeaveDays, 0),
       GREATEST(
         DAY(LAST_DAY(STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d'))) -
         CASE WHEN COALESCE(ls.approvedLeaveDays, 0) > 7 THEN COALESCE(ls.approvedLeaveDays, 0) ELSE 0 END,
         0
       ),
       DAY(LAST_DAY(STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d'))) * ?,
       (CASE WHEN COALESCE(ls.approvedLeaveDays, 0) > 7 THEN COALESCE(ls.approvedLeaveDays, 0) ELSE 0 END) * ?,
       GREATEST(
         DAY(LAST_DAY(STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d'))) -
         CASE WHEN COALESCE(ls.approvedLeaveDays, 0) > 7 THEN COALESCE(ls.approvedLeaveDays, 0) ELSE 0 END,
         0
       ) * ?,
       0,
       (
         CASE
           WHEN COALESCE(s.isExService, 0) = 1 THEN 0
           WHEN COALESCE(s.isCurrentStaff, 0) = 1 THEN (
             CASE
               WHEN COALESCE(ri.roomCategory, 'Regular') = 'PhD' THEN ${PHD_ROOM_FEE}
               WHEN ri.type = 'Single' THEN ${SINGLE_ROOM_FEE}
               WHEN ri.type = 'Double' THEN ${DOUBLE_ROOM_FEE}
               ELSE COALESCE(s.monthlyFeeAmount, 5000)
             END
           ) * 0.5
           ELSE (
             CASE
               WHEN COALESCE(ri.roomCategory, 'Regular') = 'PhD' THEN ${PHD_ROOM_FEE}
               WHEN ri.type = 'Single' THEN ${SINGLE_ROOM_FEE}
               WHEN ri.type = 'Double' THEN ${DOUBLE_ROOM_FEE}
               ELSE COALESCE(s.monthlyFeeAmount, 5000)
             END
           )
         END
       ) +
       (
         GREATEST(
           DAY(LAST_DAY(STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d'))) -
           CASE WHEN COALESCE(ls.approvedLeaveDays, 0) > 7 THEN COALESCE(ls.approvedLeaveDays, 0) ELSE 0 END,
           0
         ) * ?
       ),
       0,
       'Pending',
       LAST_DAY(STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d'))
     FROM students s
     LEFT JOIN (
       SELECT ra.studentID, r.type, r.roomCategory
       FROM room_allocations ra
       JOIN rooms r ON r.roomID = ra.roomID
       JOIN (
         SELECT studentID, MAX(allocationID) AS latestAllocationID
         FROM room_allocations
         WHERE status = 'Active'
         GROUP BY studentID
       ) latest ON latest.latestAllocationID = ra.allocationID
     ) ri ON ri.studentID = s.studentID
     LEFT JOIN (
       SELECT
         lr.studentID,
         SUM(
           GREATEST(
             0,
             DATEDIFF(
               LEAST(lr.toDate, LAST_DAY(STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d'))),
               GREATEST(lr.fromDate, STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d'))
             ) + 1
           )
         ) AS approvedLeaveDays
       FROM student_leave_requests lr
       WHERE lr.status = 'Approved'
         AND lr.fromDate <= LAST_DAY(STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d'))
         AND lr.toDate >= STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d')
       GROUP BY lr.studentID
     ) ls ON ls.studentID = s.studentID
     WHERE NOT EXISTS (
       SELECT 1
       FROM hostel_payments hp
       WHERE hp.studentID = s.studentID
         AND hp.month = ?
     )`,
    [
      month,
      DEFAULT_MESS_DAILY_RATE,
      month,
      month,
      DEFAULT_MESS_DAILY_RATE,
      DEFAULT_MESS_DAILY_RATE,
      month,
      DEFAULT_MESS_DAILY_RATE,
      month,
      DEFAULT_MESS_DAILY_RATE,
      month,
      month,
      month,
      month,
      month,
      month,
      month
    ]
  );
};

const resolveStudentIDByUserID = async (userID) => {
  const [rows] = await db.query('SELECT studentID FROM students WHERE userID = ? LIMIT 1', [userID]);
  return rows.length ? rows[0].studentID : null;
};

const refreshMonthPayments = async (month) => {
  await ensurePaymentSchema();

  await db.query(
    `UPDATE hostel_payments hp
     JOIN students s ON s.studentID = hp.studentID
     LEFT JOIN (
       SELECT ra.studentID, r.type, r.roomCategory
       FROM room_allocations ra
       JOIN rooms r ON r.roomID = ra.roomID
       JOIN (
         SELECT studentID, MAX(allocationID) AS latestAllocationID
         FROM room_allocations
         WHERE status = 'Active'
         GROUP BY studentID
       ) latest ON latest.latestAllocationID = ra.allocationID
     ) ri ON ri.studentID = hp.studentID
     LEFT JOIN (
       SELECT
         lr.studentID,
         SUM(
           GREATEST(
             0,
             DATEDIFF(
               LEAST(lr.toDate, LAST_DAY(STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d'))),
               GREATEST(lr.fromDate, STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d'))
             ) + 1
           )
         ) AS approvedLeaveDays
       FROM student_leave_requests lr
       WHERE lr.status = 'Approved'
         AND lr.fromDate <= LAST_DAY(STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d'))
         AND lr.toDate >= STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d')
       GROUP BY lr.studentID
     ) ls ON ls.studentID = hp.studentID
     SET
       hp.feeAmount = CASE
         WHEN COALESCE(s.isExService, 0) = 1 THEN 0
         WHEN COALESCE(s.isCurrentStaff, 0) = 1 THEN (
           CASE
             WHEN COALESCE(ri.roomCategory, 'Regular') = 'PhD' THEN ${PHD_ROOM_FEE}
             WHEN ri.type = 'Single' THEN ${SINGLE_ROOM_FEE}
             WHEN ri.type = 'Double' THEN ${DOUBLE_ROOM_FEE}
             ELSE COALESCE(s.monthlyFeeAmount, 5000)
           END
         ) * 0.5
         ELSE (
           CASE
             WHEN COALESCE(ri.roomCategory, 'Regular') = 'PhD' THEN ${PHD_ROOM_FEE}
             WHEN ri.type = 'Single' THEN ${SINGLE_ROOM_FEE}
             WHEN ri.type = 'Double' THEN ${DOUBLE_ROOM_FEE}
             ELSE COALESCE(s.monthlyFeeAmount, 5000)
           END
         )
       END,
       hp.messDailyRate = ?,
       hp.leaveDaysCount = COALESCE(ls.approvedLeaveDays, 0),
       hp.effectiveMessDays = GREATEST(
         DAY(LAST_DAY(STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d'))) -
         CASE WHEN COALESCE(ls.approvedLeaveDays, 0) > 7 THEN COALESCE(ls.approvedLeaveDays, 0) ELSE 0 END,
         0
       ),
       hp.messBillAmount = DAY(LAST_DAY(STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d'))) * ?,
       hp.messConcessionAmount =
         (CASE WHEN COALESCE(ls.approvedLeaveDays, 0) > 7 THEN COALESCE(ls.approvedLeaveDays, 0) ELSE 0 END) * ?,
       hp.netMessBillAmount =
         GREATEST(
           DAY(LAST_DAY(STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d'))) -
           CASE WHEN COALESCE(ls.approvedLeaveDays, 0) > 7 THEN COALESCE(ls.approvedLeaveDays, 0) ELSE 0 END,
           0
         ) * ?,
       hp.totalAmount =
         (
           CASE
             WHEN COALESCE(s.isExService, 0) = 1 THEN 0
             WHEN COALESCE(s.isCurrentStaff, 0) = 1 THEN (
               CASE
                 WHEN COALESCE(ri.roomCategory, 'Regular') = 'PhD' THEN ${PHD_ROOM_FEE}
                 WHEN ri.type = 'Single' THEN ${SINGLE_ROOM_FEE}
                 WHEN ri.type = 'Double' THEN ${DOUBLE_ROOM_FEE}
                 ELSE COALESCE(s.monthlyFeeAmount, 5000)
               END
             ) * 0.5
             ELSE (
               CASE
                 WHEN COALESCE(ri.roomCategory, 'Regular') = 'PhD' THEN ${PHD_ROOM_FEE}
                 WHEN ri.type = 'Single' THEN ${SINGLE_ROOM_FEE}
                 WHEN ri.type = 'Double' THEN ${DOUBLE_ROOM_FEE}
                 ELSE COALESCE(s.monthlyFeeAmount, 5000)
               END
             )
           END
         ) +
         (
           GREATEST(
             DAY(LAST_DAY(STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d'))) -
             CASE WHEN COALESCE(ls.approvedLeaveDays, 0) > 7 THEN COALESCE(ls.approvedLeaveDays, 0) ELSE 0 END,
             0
           ) * ?
         ) + COALESCE(hp.fineAmount, 0)
     WHERE hp.month = ?`,
    [
      month,
      month,
      month,
      month,
      DEFAULT_MESS_DAILY_RATE,
      month,
      month,
      DEFAULT_MESS_DAILY_RATE,
      DEFAULT_MESS_DAILY_RATE,
      month,
      DEFAULT_MESS_DAILY_RATE,
      month,
      DEFAULT_MESS_DAILY_RATE,
      month
    ]
  );
};

/**
 * Get payment status for a student (current month)
 */
const getPaymentStatus = async (req, res) => {
  try {
    const { studentID } = req.params;
    const userID = req.user.userID;
    const userRole = req.user.role;

    // Authorization check
    if (userRole === 'Student') {
      const [student] = await db.query('SELECT userID FROM students WHERE studentID = ?', [studentID]);
      if (!student.length || student[0].userID !== userID) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access'
        });
      }
    }

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    await ensureMonthPayments(currentMonth);
    await refreshMonthPayments(currentMonth);

    const [payment] = await db.query(`
      SELECT 
        paymentID,
        month,
        feeAmount,
        messDailyRate,
        leaveDaysCount,
        effectiveMessDays,
        messBillAmount,
        messConcessionAmount,
        netMessBillAmount,
        fineAmount,
        totalAmount,
        paidAmount,
        paymentStatus,
        paymentDueDate,
        paymentDate,
        paymentMethod,
        receiptNumber,
        remarks
      FROM hostel_payments
      WHERE studentID = ? AND month = ?
    `, [studentID, currentMonth]);

    if (!payment.length) {
      return res.status(404).json({
        success: false,
        message: 'No payment record found for current month'
      });
    }

    res.json({
      success: true,
      data: payment[0]
    });

  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment status',
      error: error.message
    });
  }
};

/**
 * Get payment status for currently logged-in student
 */
const getMyPaymentStatus = async (req, res) => {
  try {
    if (req.user.role !== 'Student') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Students only.'
      });
    }

    const studentID = await resolveStudentIDByUserID(req.user.userID);
    if (!studentID) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    await ensureMonthPayments(currentMonth);
    await refreshMonthPayments(currentMonth);

    const [payment] = await db.query(`
      SELECT
        paymentID,
        studentID,
        month,
        feeAmount,
        messDailyRate,
        leaveDaysCount,
        effectiveMessDays,
        messBillAmount,
        messConcessionAmount,
        netMessBillAmount,
        fineAmount,
        totalAmount,
        paidAmount,
        paymentStatus,
        paymentDueDate,
        paymentDate,
        paymentMethod,
        receiptNumber,
        remarks
      FROM hostel_payments
      WHERE studentID = ? AND month = ?
      LIMIT 1
    `, [studentID, currentMonth]);

    if (!payment.length) {
      return res.status(404).json({
        success: false,
        message: 'No payment record found for current month'
      });
    }

    res.json({ success: true, data: payment[0] });
  } catch (error) {
    console.error('Get my payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your payment status',
      error: error.message
    });
  }
};

/**
 * Get payment history for a student
 */
const getPaymentHistory = async (req, res) => {
  try {
    const { studentID } = req.params;
    const userID = req.user.userID;
    const userRole = req.user.role;
    const { limit = 12, offset = 0 } = req.query;
  await ensurePaymentSchema();


    // Authorization check
    if (userRole === 'Student') {
      const [student] = await db.query('SELECT userID FROM students WHERE studentID = ?', [studentID]);
      if (!student.length || student[0].userID !== userID) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access'
        });
      }
    }

    const [payments] = await db.query(`
      SELECT 
        paymentID,
        month,
        feeAmount,
        messDailyRate,
        leaveDaysCount,
        effectiveMessDays,
        messBillAmount,
        messConcessionAmount,
        netMessBillAmount,
        fineAmount,
        totalAmount,
        paidAmount,
        paymentStatus,
        paymentDueDate,
        paymentDate,
        paymentMethod,
        receiptNumber,
        updatedAt
      FROM hostel_payments
      WHERE studentID = ?
      ORDER BY month DESC
      LIMIT ? OFFSET ?
    `, [studentID, parseInt(limit), parseInt(offset)]);

    const [totalCount] = await db.query(`
      SELECT COUNT(*) as total FROM hostel_payments WHERE studentID = ?
    `, [studentID]);

    res.json({
      success: true,
      data: {
        payments,
        total: totalCount[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
      error: error.message
    });
  }
};

/**
 * Get payment history for currently logged-in student
 */
const getMyPaymentHistory = async (req, res) => {
  try {
    if (req.user.role !== 'Student') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Students only.'
      });
    }

    const { limit = 12, offset = 0 } = req.query;
    const studentID = await resolveStudentIDByUserID(req.user.userID);

    if (!studentID) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const [payments] = await db.query(`
      SELECT
        paymentID,
        month,
        feeAmount,
        messDailyRate,
        leaveDaysCount,
        effectiveMessDays,
        messBillAmount,
        messConcessionAmount,
        netMessBillAmount,
        fineAmount,
        totalAmount,
        paidAmount,
        paymentStatus,
        paymentDueDate,
        paymentDate,
        paymentMethod,
        receiptNumber,
        updatedAt
      FROM hostel_payments
      WHERE studentID = ?
      ORDER BY month DESC
      LIMIT ? OFFSET ?
    `, [studentID, parseInt(limit, 10), parseInt(offset, 10)]);

    const [totalCount] = await db.query(
      'SELECT COUNT(*) as total FROM hostel_payments WHERE studentID = ?',
      [studentID]
    );

    res.json({
      success: true,
      data: {
        payments,
        total: totalCount[0].total,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      }
    });
  } catch (error) {
    console.error('Get my payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your payment history',
      error: error.message
    });
  }
};

/**
 * Get all students' payment status (Admin/Warden only)
 */
const getAllStudentsPaymentStatus = async (req, res) => {
  try {
    const { status, month, limit = 50, offset = 0 } = req.query;
    const selectedMonth = month || new Date().toISOString().slice(0, 7);
    await ensureMonthPayments(selectedMonth);
    await refreshMonthPayments(selectedMonth);

    let query = `
      SELECT 
        hp.paymentID,
        hp.studentID,
        s.name as studentName,
        s.year,
        hp.month,
        hp.feeAmount,
        hp.messDailyRate,
        hp.leaveDaysCount,
        hp.effectiveMessDays,
        hp.messBillAmount,
        hp.messConcessionAmount,
        hp.netMessBillAmount,
        hp.fineAmount,
        hp.totalAmount,
        hp.paidAmount,
        hp.paymentStatus,
        hp.paymentDueDate,
        hp.paymentDate,
        hp.receiptNumber
      FROM hostel_payments hp
      JOIN students s ON hp.studentID = s.studentID
      WHERE 1=1
    `;

    const params = [];

    if (status) {
      query += ' AND hp.paymentStatus = ?';
      params.push(status);
    }

    if (month) {
      query += ' AND hp.month = ?';
      params.push(month);
    }

    query += ' ORDER BY hp.updatedAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [payments] = await db.query(query, params);

    const countQuery = `
      SELECT COUNT(*) as total FROM hostel_payments hp
      WHERE 1=1 ${status ? 'AND hp.paymentStatus = ?' : ''} ${month ? 'AND hp.month = ?' : ''}
    `;
    const countParams = [];
    if (status) countParams.push(status);
    if (month) countParams.push(month);

    const [countResult] = await db.query(countQuery, countParams);

    res.json({
      success: true,
      data: {
        payments,
        total: countResult[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Get all students payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students payment status',
      error: error.message
    });
  }
};

/**
 * Record a payment
 */
const recordPayment = async (req, res) => {
  try {
    const { paymentID, amountPaid, paymentMethod, remarks } = req.body;

    if (!paymentID || !amountPaid || amountPaid <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment details'
      });
    }

    // Get current payment details
    const [currentPayment] = await db.query(`
      SELECT 
        paymentID,
        studentID,
        totalAmount,
        paidAmount,
        paymentStatus
      FROM hostel_payments
      WHERE paymentID = ?
    `, [paymentID]);

    if (!currentPayment.length) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    const payment = currentPayment[0];
    const newPaidAmount = payment.paidAmount + amountPaid;
    const previousStatus = payment.paymentStatus;

    let newStatus = 'Pending';
    if (newPaidAmount >= payment.totalAmount) {
      newStatus = 'Full';
    } else if (newPaidAmount > 0) {
      newStatus = 'Partial';
    }

    // Update payment
    await db.query(`
      UPDATE hostel_payments
      SET 
        paidAmount = ?,
        paymentStatus = ?,
        paymentDate = NOW(),
        paymentMethod = ?,
        updatedAt = NOW()
      WHERE paymentID = ?
    `, [newPaidAmount, newStatus, paymentMethod || 'Online Transfer', paymentID]);

    // Log payment history
    await db.query(`
      INSERT INTO payment_history 
      (paymentID, previousStatus, newStatus, amountPaid, changedBy, reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [paymentID, previousStatus, newStatus, amountPaid, req.user.userID, remarks || '']);

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        paymentID,
        newPaidAmount,
        paymentStatus: newStatus,
        receiptNumber: `RCP-${paymentID}-${Date.now()}`
      }
    });

  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record payment',
      error: error.message
    });
  }
};

/**
 * Calculate fine for overdue payment
 */
const calculateFine = async (req, res) => {
  try {
    const { paymentID } = req.params;

    const [payment] = await db.query(`
      SELECT 
        paymentID,
        feeAmount,
        fineAmount,
        paymentDueDate,
        paymentStatus
      FROM hostel_payments
      WHERE paymentID = ?
    `, [paymentID]);

    if (!payment.length) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    const p = payment[0];
    const today = new Date();
    const dueDate = new Date(p.paymentDueDate);
    const daysLate = Math.max(0, Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)));

    // Get applicable fine percentage
    const [fineRule] = await db.query(`
      SELECT finePercentage
      FROM fine_rules
      WHERE daysLate <= ? AND isActive = TRUE
      ORDER BY daysLate DESC
      LIMIT 1
    `, [daysLate]);

    const finePercentage = fineRule.length > 0 ? fineRule[0].finePercentage : 0;
    const calculatedFine = (p.feeAmount * finePercentage) / 100;

    res.json({
      success: true,
      data: {
        daysLate,
        finePercentage,
        calculatedFine,
        currentFine: p.fineAmount,
        status: p.paymentStatus
      }
    });

  } catch (error) {
    console.error('Calculate fine error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate fine',
      error: error.message
    });
  }
};

/**
 * Generate receipt for a payment
 */
const generateReceipt = async (req, res) => {
  try {
    const { paymentID } = req.params;

    const [payment] = await db.query(`
      SELECT 
        hp.paymentID,
        hp.studentID,
        s.name as studentName,
        s.year,
        s.department,
        hp.month,
        hp.feeAmount,
        hp.messDailyRate,
        hp.leaveDaysCount,
        hp.effectiveMessDays,
        hp.messBillAmount,
        hp.messConcessionAmount,
        hp.netMessBillAmount,
        hp.fineAmount,
        hp.totalAmount,
        hp.paidAmount,
        hp.paymentStatus,
        hp.paymentDueDate,
        hp.paymentDate,
        hp.paymentMethod,
        hp.receiptNumber
      FROM hostel_payments hp
      JOIN students s ON hp.studentID = s.studentID
      WHERE hp.paymentID = ?
    `, [paymentID]);

    if (!payment.length) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    const p = payment[0];
    const receiptNumber = p.receiptNumber || `RCP-${p.paymentID}-${Date.now()}`;

    // Update receipt number if not exists
    if (!p.receiptNumber) {
      await db.query(`
        UPDATE hostel_payments
        SET receiptNumber = ?
        WHERE paymentID = ?
      `, [receiptNumber, paymentID]);
    }

    const feeAmount = Number(p.feeAmount || 0);
    const messDailyRate = Number(p.messDailyRate || 0);
    const netMessBillAmount = Number(p.netMessBillAmount || 0);
    const messConcessionAmount = Number(p.messConcessionAmount || 0);
    const fineAmount = Number(p.fineAmount || 0);
    const totalAmount = Number(p.totalAmount || 0);
    const paidAmount = Number(p.paidAmount || 0);
    const outstandingAmount = totalAmount - paidAmount;

    // HTML receipt format
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .receipt { max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; font-size: 20px; font-weight: bold; }
          .info { margin-bottom: 20px; }
          .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
          .amount { font-weight: bold; font-size: 16px; }
          .table { width: 100%; margin: 20px 0; border-collapse: collapse; }
          .table th, .table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          .total-section { margin-top: 30px; padding: 10px; background: #f5f5f5; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">🏢 HOSTEL MANAGEMENT SYSTEM</div>
          <div class="header" style="font-size: 14px;">Payment Receipt</div>
          
          <div class="info">
            <div class="info-row">
              <span>Receipt No:</span>
              <span class="amount">${receiptNumber}</span>
            </div>
            <div class="info-row">
              <span>Date:</span>
              <span>${new Date().toLocaleDateString()}</span>
            </div>
          </div>

          <div class="info">
            <strong>Student Details</strong>
            <div class="info-row">
              <span>Name:</span>
              <span>${p.studentName}</span>
            </div>
            <div class="info-row">
              <span>Student ID:</span>
              <span>${p.studentID}</span>
            </div>
            <div class="info-row">
              <span>Year:</span>
              <span>${p.year}</span>
            </div>
            <div class="info-row">
              <span>Department:</span>
              <span>${p.department || 'N/A'}</span>
            </div>
          </div>

          <div class="info">
            <strong>Payment Details</strong>
            <div class="info-row">
              <span>Month:</span>
              <span>${p.month}</span>
            </div>
            <div class="info-row">
              <span>Due Date:</span>
              <span>${new Date(p.paymentDueDate).toLocaleDateString()}</span>
            </div>
            <div class="info-row">
              <span>Payment Method:</span>
              <span>${p.paymentMethod}</span>
            </div>
          </div>

          <table class="table">
            <tr>
              <th>Description</th>
              <th style="text-align: right;">Amount</th>
            </tr>
            <tr>
              <td>Hostel Fee</td>
              <td style="text-align: right;">₹${feeAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Mess Bill (Full Month)</td>
              <td style="text-align: right;">₹${Number(p.messBillAmount || 0).toFixed(2)}</td>
            </tr>
            ${messConcessionAmount > 0 ? `
            <tr>
              <td>Mess Concession (${p.leaveDaysCount} leave days approved)</td>
              <td style="text-align: right; color: #2e7d32;">-₹${messConcessionAmount.toFixed(2)}</td>
            </tr>
            ` : ''}
            <tr>
              <td>Net Mess Bill (${p.effectiveMessDays} days @ ₹${messDailyRate.toFixed(2)})</td>
              <td style="text-align: right;">₹${netMessBillAmount.toFixed(2)}</td>
            </tr>
            ${fineAmount > 0 ? `
            <tr>
              <td>Late Payment Fine</td>
              <td style="text-align: right;">₹${fineAmount.toFixed(2)}</td>
            </tr>
            ` : ''}
          </table>

          <div class="total-section">
            <div class="info-row">
              <span>Total Amount:</span>
              <span class="amount">₹${totalAmount.toFixed(2)}</span>
            </div>
            <div class="info-row">
              <span>Amount Paid:</span>
              <span class="amount">₹${paidAmount.toFixed(2)}</span>
            </div>
            <div class="info-row">
              <span>Outstanding:</span>
              <span class="amount">₹${outstandingAmount.toFixed(2)}</span>
            </div>
            <div class="info-row">
              <span style="font-weight: bold;">Status:</span>
              <span class="amount">${p.paymentStatus}</span>
            </div>
          </div>

          <div class="footer">
            <p>This is an auto-generated receipt. Please keep it for your records.</p>
            <p>For queries, contact the Hostel Office</p>
            <p style="margin-top: 20px;">Generated on: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    res.json({
      success: true,
      data: {
        receiptNumber,
        receiptHTML,
        paymentDetails: p
      }
    });

  } catch (error) {
    console.error('Generate receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate receipt',
      error: error.message
    });
  }
};

/**
 * Get payment summary for admin dashboard
 */
const getPaymentSummary = async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    await ensureMonthPayments(currentMonth);
    await refreshMonthPayments(currentMonth);

    const [summary] = await db.query(`
      SELECT 
        COUNT(DISTINCT studentID) as totalStudents,
        SUM(CASE WHEN paymentStatus = 'Full' THEN 1 ELSE 0 END) as paidStudents,
        SUM(CASE WHEN paymentStatus = 'Partial' THEN 1 ELSE 0 END) as partialPaidStudents,
        SUM(CASE WHEN paymentStatus = 'Pending' OR paymentStatus = 'Overdue' THEN 1 ELSE 0 END) as unpaidStudents,
        SUM(totalAmount) as totalDue,
        SUM(paidAmount) as totalCollected,
        SUM(fineAmount) as totalFinesCollected,
        SUM(messConcessionAmount) as totalMessConcession,
        SUM(netMessBillAmount) as totalNetMessBill
      FROM hostel_payments
      WHERE month = ?
    `, [currentMonth]);

    const [statusDistribution] = await db.query(`
      SELECT 
        paymentStatus,
        COUNT(*) as count
      FROM hostel_payments
      WHERE month = ?
      GROUP BY paymentStatus
    `, [currentMonth]);

    res.json({
      success: true,
      data: {
        summary: summary[0],
        statusDistribution,
        month: currentMonth
      }
    });

  } catch (error) {
    console.error('Get payment summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment summary',
      error: error.message
    });
  }
};

/**
 * Send fee reminder to a student over WhatsApp (Admin/Warden)
 */
const sendFeeReminder = async (req, res) => {
  try {
    const { studentID } = req.params;

    const currentMonth = new Date().toISOString().slice(0, 7);
    await ensureMonthPayments(currentMonth);
    await refreshMonthPayments(currentMonth);

    const [rows] = await db.query(
      `SELECT hp.paymentID, hp.month, hp.feeAmount, hp.paymentDueDate, hp.paymentStatus,
              s.name, s.phoneNumber
       FROM hostel_payments hp
       JOIN students s ON hp.studentID = s.studentID
       WHERE hp.studentID = ? AND hp.month = ?
       LIMIT 1`,
      [studentID, currentMonth]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found for this student and month'
      });
    }

    const payment = rows[0];
    const appBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const paymentUrl = `${appBaseUrl}/student/payment-history`;

    const result = await sendFeeReminderWhatsApp({
      phoneNumber: payment.phoneNumber,
      studentName: payment.name,
      month: payment.month,
      feeAmount: payment.feeAmount,
      dueDate: payment.paymentDueDate,
      paymentUrl
    });

    res.json({
      success: true,
      message: result.sent ? 'Fee reminder sent on WhatsApp' : 'Fee reminder was not sent',
      data: result
    });
  } catch (error) {
    console.error('Send fee reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send fee reminder',
      error: error.message
    });
  }
};

module.exports = {
  getMyPaymentStatus,
  getMyPaymentHistory,
  getPaymentStatus,
  getPaymentHistory,
  getAllStudentsPaymentStatus,
  recordPayment,
  calculateFine,
  generateReceipt,
  getPaymentSummary,
  sendFeeReminder
};
