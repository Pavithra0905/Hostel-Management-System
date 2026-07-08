/**
 * ROOM ALLOCATION CONTROLLER
 * Implements MODULE 2: Priority-Based Room Allocation
 * Year-based allocation: Final Year → Single rooms, Third Year → Double rooms
 */

const db = require('../config/db');
const path = require('path');
const nodemailer = require('nodemailer');
const { generateBookingReceiptPdf } = require('../utils/bookingReceiptGenerator');
const { sendBookingConfirmationWhatsApp, sendBookingDecisionWhatsApp } = require('../utils/whatsappNotifier');

const FIXED_MONTHLY_FEE = {
  Single: 6000,
  Double: 4000,
  PhD: 10000
};

const generateBookingTransactionReference = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `BKTXN-${y}${m}${d}${h}${mi}${s}-${rand}`;
};

const PHD_FALLBACK_MIN_AVAILABLE_ROOMS = 3;
const VACANCY_THRESHOLD_HOURS = 0;

const sendRoomCancellationEmail = async ({ toEmail, studentName, roomNumber, cancelledAt }) => {
  const {
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_USER,
    EMAIL_PASSWORD,
    EMAIL_FROM
  } = process.env;

  const smtpPassword = String(EMAIL_PASSWORD || '').replace(/\s+/g, '');

  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !smtpPassword || !toEmail) {
    throw new Error('Email SMTP settings or recipient email are missing');
  }

  const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT),
    secure: Number(EMAIL_PORT) === 465,
    requireTLS: Number(EMAIL_PORT) !== 465,
    auth: {
      user: EMAIL_USER,
      pass: smtpPassword
    },
    tls: process.env.NODE_ENV === 'development' || process.env.SMTP_ALLOW_SELF_SIGNED === 'true'
      ? { rejectUnauthorized: false }
      : undefined
  });

  const formattedTime = cancelledAt ? new Date(cancelledAt).toLocaleString('en-GB') : new Date().toLocaleString('en-GB');

  console.log(`[Room Cancellation Email] Attempting send to ${toEmail} for room ${roomNumber || 'N/A'}`);

  const info = await transporter.sendMail({
    from: EMAIL_FROM || EMAIL_USER,
    to: toEmail,
    subject: 'Hostel Management - Room Allocation Cancelled',
    text: `Hello ${studentName || 'Student'}, your room allocation for Room ${roomNumber || 'N/A'} has been cancelled on ${formattedTime}. Please check your dashboard for updates.`,
    html: `
      <p>Hello ${studentName || 'Student'},</p>
      <p>Your hostel room allocation has been cancelled.</p>
      <p><strong>Room Number:</strong> ${roomNumber || 'N/A'}</p>
      <p><strong>Cancelled At:</strong> ${formattedTime}</p>
      <p>Please log in to your dashboard to view the updated room status and waiting-list information.</p>
    `
  });

  console.log(
    `[Room Cancellation Email] Sent to ${toEmail}; messageId=${info.messageId || 'N/A'}; accepted=${JSON.stringify(info.accepted || [])}; rejected=${JSON.stringify(info.rejected || [])}`
  );

  return info;
};

const sendRoomAllocationEmail = async ({ toEmail, studentName, roomNumber, allocationDate, roomType, roomCategory }) => {
  const {
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_USER,
    EMAIL_PASSWORD,
    EMAIL_FROM
  } = process.env;

  const smtpPassword = String(EMAIL_PASSWORD || '').replace(/\s+/g, '');

  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !smtpPassword || !toEmail) {
    throw new Error('Email SMTP settings or recipient email are missing');
  }

  const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT),
    secure: Number(EMAIL_PORT) === 465,
    requireTLS: Number(EMAIL_PORT) !== 465,
    auth: {
      user: EMAIL_USER,
      pass: smtpPassword
    },
    tls: process.env.NODE_ENV === 'development' || process.env.SMTP_ALLOW_SELF_SIGNED === 'true'
      ? { rejectUnauthorized: false }
      : undefined
  });

  const formattedTime = allocationDate ? new Date(allocationDate).toLocaleString('en-GB') : new Date().toLocaleString('en-GB');

  console.log(`[Room Allocation Email] Attempting send to ${toEmail} for room ${roomNumber || 'N/A'}`);

  const info = await transporter.sendMail({
    from: EMAIL_FROM || EMAIL_USER,
    to: toEmail,
    subject: 'Hostel Management - Room Allocated',
    text: `Hello ${studentName || 'Student'}, your room allocation has been confirmed for Room ${roomNumber || 'N/A'} (${roomType || 'Room'}${roomCategory ? `, ${roomCategory}` : ''}) on ${formattedTime}. Please check your dashboard for details.`,
    html: `
      <p>Hello ${studentName || 'Student'},</p>
      <p>Your hostel room has been allocated.</p>
      <p><strong>Room Number:</strong> ${roomNumber || 'N/A'}</p>
      <p><strong>Room Type:</strong> ${roomType || 'N/A'}</p>
      <p><strong>Category:</strong> ${roomCategory || 'N/A'}</p>
      <p><strong>Allocated At:</strong> ${formattedTime}</p>
      <p>Please log in to your dashboard to view your room details.</p>
    `
  });

  console.log(
    `[Room Allocation Email] Sent to ${toEmail}; messageId=${info.messageId || 'N/A'}; accepted=${JSON.stringify(info.accepted || [])}; rejected=${JSON.stringify(info.rejected || [])}`
  );

  return info;
};

const sendRoomAllocationNotifications = async (notifications = []) => {
  for (const notification of notifications) {
    try {
      const info = await sendRoomAllocationEmail(notification);
      await db.query(
        `INSERT INTO room_notification_logs
         (allocationID, studentID, roomID, eventType, message, emailTo, emailStatus, emailMessageID)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          notification.allocationID,
          notification.studentID,
          notification.roomID,
          'Email Sent',
          `Room ${notification.roomNumber || 'N/A'} allocated to ${notification.studentName || 'Student'}. Email sent successfully.`,
          notification.toEmail,
          'Sent',
          info?.messageId || null
        ]
      );
    } catch (mailError) {
      console.error('Room allocation email failed:', mailError.message);
      try {
        await db.query(
          `INSERT INTO room_notification_logs
           (allocationID, studentID, roomID, eventType, message, emailTo, emailStatus)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            notification.allocationID,
            notification.studentID,
            notification.roomID,
            'Email Failed',
            `Room ${notification.roomNumber || 'N/A'} allocated to ${notification.studentName || 'Student'}, but email failed: ${mailError.message}`,
            notification.toEmail,
            'Failed'
          ]
        );
      } catch (logError) {
        console.error('Failed to write room email failure log:', logError.message);
      }
    }
  }
};

const getRegularTypeCondition = (studentYear) => {
  if (studentYear === 'Final') {
    return {
      condition: " AND type = 'Single'",
      allowedRoomTypes: ['Single']
    };
  }

  if (studentYear === 'Third') {
    return {
      condition: " AND type = 'Double'",
      allowedRoomTypes: ['Double']
    };
  }

  return {
    condition: '',
    allowedRoomTypes: ['Single', 'Double']
  };
};

const canUsePhDRoomFallback = async (queryExecutor, studentYear) => {
  const { condition } = getRegularTypeCondition(studentYear);

  const [regularCountRows] = await queryExecutor.query(
    `SELECT COUNT(*) AS availableCount
     FROM rooms
     WHERE roomCategory = 'Regular'
       AND status = 'Available'
       AND occupancy < capacity${condition}`
  );

  const regularAvailableCount = Number(regularCountRows[0]?.availableCount || 0);
  if (regularAvailableCount > 0) {
    return {
      canUseFallback: false,
      regularAvailableCount,
      phdAvailableCount: 0
    };
  }

  const [phdCountRows] = await queryExecutor.query(
    `SELECT COUNT(*) AS availableCount
     FROM rooms
     WHERE roomCategory = 'PhD'
       AND status = 'Available'
       AND occupancy < capacity`
  );

  const phdAvailableCount = Number(phdCountRows[0]?.availableCount || 0);

  return {
    canUseFallback: phdAvailableCount >= PHD_FALLBACK_MIN_AVAILABLE_ROOMS,
    regularAvailableCount,
    phdAvailableCount
  };
};

const isRoomEligibleForStudent = async (queryExecutor, room, studentYear) => {
  if (studentYear === 'PhD') {
    return room.roomCategory === 'PhD';
  }

  if (room.roomCategory === 'PhD') {
    const fallbackEligibility = await canUsePhDRoomFallback(queryExecutor, studentYear);
    if (!fallbackEligibility.canUseFallback) {
      return false;
    }
  }

  if (studentYear === 'Final' && room.type !== 'Single') {
    return false;
  }

  if (studentYear === 'Third' && room.type !== 'Double') {
    return false;
  }

  return true;
};

const ensureReallocationTables = async () => {
  await db.query(
    `CREATE TABLE IF NOT EXISTS room_waiting_list (
      waitingID INT AUTO_INCREMENT PRIMARY KEY,
      studentID INT NOT NULL,
      roomID INT NOT NULL,
      status ENUM('Pending', 'Allocated', 'Cancelled', 'Expired') NOT NULL DEFAULT 'Pending',
      remarks VARCHAR(500) NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      allocatedAt DATETIME NULL,
      cancelledAt DATETIME NULL,
      FOREIGN KEY (studentID) REFERENCES students(studentID) ON DELETE CASCADE,
      FOREIGN KEY (roomID) REFERENCES rooms(roomID) ON DELETE CASCADE,
      INDEX idx_waiting_room_status_created (roomID, status, createdAt),
      INDEX idx_waiting_student_status (studentID, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  await db.query(
    `CREATE TABLE IF NOT EXISTS room_reallocation_logs (
      reallocationLogID INT AUTO_INCREMENT PRIMARY KEY,
      roomID INT NOT NULL,
      waitingID INT NOT NULL,
      studentID INT NOT NULL,
      triggeredByAllocationID INT NULL,
      newAllocationID INT NOT NULL,
      ruleApplied VARCHAR(255) NOT NULL DEFAULT 'Immediate after cancellation, FIFO waiting list',
      notes VARCHAR(500) NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (roomID) REFERENCES rooms(roomID) ON DELETE CASCADE,
      FOREIGN KEY (waitingID) REFERENCES room_waiting_list(waitingID) ON DELETE CASCADE,
      FOREIGN KEY (studentID) REFERENCES students(studentID) ON DELETE CASCADE,
      FOREIGN KEY (triggeredByAllocationID) REFERENCES room_allocations(allocationID) ON DELETE SET NULL,
      FOREIGN KEY (newAllocationID) REFERENCES room_allocations(allocationID) ON DELETE CASCADE,
      INDEX idx_realloc_room_created (roomID, createdAt),
      INDEX idx_realloc_student_created (studentID, createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );
};

const processRoomReallocation = async (connection, roomID, triggeredByAllocationID = null) => {
  const [roomRows] = await connection.query(
    `SELECT roomID, roomNumber, type, roomCategory, capacity, occupancy, status
     FROM rooms
     WHERE roomID = ?
     FOR UPDATE`,
    [roomID]
  );

  if (roomRows.length === 0) {
    return { allocatedCount: 0 };
  }

  const room = roomRows[0];
  if (room.occupancy >= room.capacity) {
    return { allocatedCount: 0, notifications: [] };
  }

  const [cancellationRows] = await connection.query(
    `SELECT allocationID, releaseDate
     FROM room_allocations
     WHERE roomID = ? AND status = 'Cancelled' AND releaseDate IS NOT NULL
     ORDER BY releaseDate DESC
     LIMIT 1`,
    [roomID]
  );

  if (cancellationRows.length === 0) {
    return { allocatedCount: 0, notifications: [] };
  }

  const [ageRows] = await connection.query(
    'SELECT TIMESTAMPDIFF(HOUR, ?, NOW()) AS vacantHours',
    [cancellationRows[0].releaseDate]
  );

  const vacantHours = Number(ageRows[0]?.vacantHours || 0);
  if (vacantHours < VACANCY_THRESHOLD_HOURS) {
    return { allocatedCount: 0, vacantHours, notifications: [] };
  }

  let allocatedCount = 0;
  const notifications = [];

  while (room.occupancy < room.capacity) {
    const [waitingRows] = await connection.query(
      `SELECT w.waitingID, w.studentID, s.year AS studentYear, s.name AS studentName, u.email AS studentEmail
       FROM room_waiting_list w
       JOIN students s ON s.studentID = w.studentID
       JOIN users u ON u.userID = s.userID
       WHERE w.roomID = ? AND w.status = 'Pending'
       ORDER BY w.createdAt ASC, w.waitingID ASC
       LIMIT 1
       FOR UPDATE`,
      [roomID]
    );

    if (waitingRows.length === 0) {
      break;
    }

    const waiting = waitingRows[0];

    const [existingAllocationRows] = await connection.query(
      'SELECT allocationID FROM room_allocations WHERE studentID = ? AND status = ? LIMIT 1',
      [waiting.studentID, 'Active']
    );

    if (existingAllocationRows.length > 0) {
      await connection.query(
        `UPDATE room_waiting_list
         SET status = 'Expired', remarks = ?, updatedAt = NOW(), cancelledAt = NOW()
         WHERE waitingID = ?`,
        ['Skipped: student already has an active allocation', waiting.waitingID]
      );
      continue;
    }

    const eligible = await isRoomEligibleForStudent(connection, room, waiting.studentYear);
    if (!eligible) {
      await connection.query(
        `UPDATE room_waiting_list
         SET status = 'Expired', remarks = ?, updatedAt = NOW(), cancelledAt = NOW()
         WHERE waitingID = ?`,
        ['Skipped: room not eligible for student year/category', waiting.waitingID]
      );
      continue;
    }

    const [allocationResult] = await connection.query(
      `INSERT INTO room_allocations (studentID, roomID, allocatedBy, status, remarks)
       VALUES (?, ?, NULL, 'Active', ?)`,
      [waiting.studentID, roomID, 'Auto-reallocated from FIFO waiting list after 3 days vacancy']
    );

    await connection.query(
      'UPDATE rooms SET occupancy = occupancy + 1 WHERE roomID = ?',
      [roomID]
    );

    room.occupancy += 1;

    if (room.occupancy >= room.capacity) {
      await connection.query(
        "UPDATE rooms SET status = 'Occupied' WHERE roomID = ?",
        [roomID]
      );
    } else {
      await connection.query(
        "UPDATE rooms SET status = 'Available' WHERE roomID = ?",
        [roomID]
      );
    }

    await connection.query(
      `UPDATE room_waiting_list
       SET status = 'Allocated', remarks = ?, allocatedAt = NOW(), updatedAt = NOW()
       WHERE waitingID = ?`,
      ['Auto-allocated from waiting list', waiting.waitingID]
    );

    await connection.query(
      `INSERT INTO room_reallocation_logs
       (roomID, waitingID, studentID, triggeredByAllocationID, newAllocationID, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        roomID,
        waiting.waitingID,
        waiting.studentID,
        triggeredByAllocationID || cancellationRows[0].allocationID,
        allocationResult.insertId,
        `Room vacant for ${vacantHours} hours (threshold ${VACANCY_THRESHOLD_HOURS}h)`
      ]
    );

    notifications.push({
      allocationID: allocationResult.insertId,
      studentID: waiting.studentID,
      roomID,
      toEmail: waiting.studentEmail,
      studentName: waiting.studentName,
      roomNumber: room.roomNumber,
      allocationDate: new Date(),
      roomType: room.type,
      roomCategory: room.roomCategory
    });

    allocatedCount += 1;
  }

  return { allocatedCount, vacantHours, notifications };
};

const runAutomaticReallocationSweep = async () => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [roomsToProcess] = await connection.query(
      `SELECT DISTINCT ra.roomID
       FROM room_allocations ra
       JOIN rooms r ON r.roomID = ra.roomID
       WHERE ra.status = 'Cancelled'
         AND ra.releaseDate IS NOT NULL
         AND ra.releaseDate <= (NOW() - INTERVAL ? HOUR)
         AND r.occupancy < r.capacity`,
      [VACANCY_THRESHOLD_HOURS]
    );

    let totalAllocated = 0;
    let notifications = [];
    for (const item of roomsToProcess) {
      const result = await processRoomReallocation(connection, item.roomID);
      totalAllocated += Number(result.allocatedCount || 0);
      notifications = notifications.concat(result.notifications || []);
    }

    await connection.commit();
    await sendRoomAllocationNotifications(notifications);
    return { roomsScanned: roomsToProcess.length, totalAllocated };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * TASK 2: YEAR-BASED ALLOCATION ENGINE
 * Allocate room to student based on their academic year
 * Final Year students → Single rooms only
 * Third Year students → Double rooms only
 * Other years → Any available rooms
 */
const allocateRoom = async (req, res) => {
  const connection = await db.getConnection();
  const startTime = Date.now(); // Track allocation processing time
  
  try {
    const { roomID } = req.body;
    const studentID = req.user.studentID;
    const studentYear = req.user.year;
    const userID = req.user.userID;

    if (!roomID) {
      return res.status(400).json({
        success: false,
        message: 'Room ID is required'
      });
    }

    // Begin transaction with row locking (TASK 2: Lock room during allocation)
    await connection.beginTransaction();

    // Fetch room details with FOR UPDATE lock to prevent double booking
    const [rooms] = await connection.query(
      'SELECT roomID, roomNumber, type, roomCategory, capacity, occupancy, status FROM rooms WHERE roomID = ? FOR UPDATE',
      [roomID]
    );

    if (rooms.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    const room = rooms[0];

    // Check if room is available
    if (room.status !== 'Available' || room.occupancy >= room.capacity) {
      await connection.rollback();
      
      // Log failed allocation attempt
      const processingTime = Date.now() - startTime;
      await logAllocation(studentID, roomID, processingTime, false, 'Room not available');

      return res.status(400).json({
        success: false,
        message: 'Room is not available'
      });
    }

    // ===== YEAR-BASED ELIGIBILITY CHECK =====

    // RULE 0: PhD scholars can only book PhD rooms
    if (studentYear === 'PhD' && room.roomCategory !== 'PhD') {
      await connection.rollback();

      const processingTime = Date.now() - startTime;
      await logAllocation(studentID, roomID, processingTime, false, 'PhD scholars can only book PhD rooms');

      return res.status(400).json({
        success: false,
        message: 'PhD scholars can only book PhD rooms'
      });
    }

    // Non-PhD students can book PhD rooms only when fallback rule is satisfied
    if (studentYear !== 'PhD' && room.roomCategory === 'PhD') {
      const fallbackEligibility = await canUsePhDRoomFallback(connection, studentYear);

      if (!fallbackEligibility.canUseFallback) {
        await connection.rollback();

        const processingTime = Date.now() - startTime;
        await logAllocation(
          studentID,
          roomID,
          processingTime,
          false,
          `PhD fallback not allowed: regularAvailable=${fallbackEligibility.regularAvailableCount}, phdAvailable=${fallbackEligibility.phdAvailableCount}`
        );

        return res.status(400).json({
          success: false,
          message: `PhD rooms can only be booked when no regular eligible rooms are available and at least ${PHD_FALLBACK_MIN_AVAILABLE_ROOMS} PhD rooms are free`
        });
      }
    }
    
    // RULE 1: Final Year students → SINGLE rooms only
    if (studentYear === 'Final' && room.type !== 'Single') {
      await connection.rollback();
      
      const processingTime = Date.now() - startTime;
      await logAllocation(studentID, roomID, processingTime, false, 'Final year students can only book Single rooms');

      return res.status(400).json({
        success: false,
        message: 'Final year students can only book Single rooms',
        suggestion: 'Please select a Single room'
      });
    }

    // RULE 2: Third Year students → DOUBLE rooms only
    if (studentYear === 'Third' && room.type !== 'Double') {
      await connection.rollback();
      
      const processingTime = Date.now() - startTime;
      await logAllocation(studentID, roomID, processingTime, false, 'Third year students can only book Double rooms');

      return res.status(400).json({
        success: false,
        message: 'Third year students can only book Double rooms',
        suggestion: 'Please select a Double room'
      });
    }

    // Check if student already has an active allocation
    const [existingAllocations] = await connection.query(
      'SELECT allocationID FROM room_allocations WHERE studentID = ? AND status = ?',
      [studentID, 'Active']
    );

    if (existingAllocations.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'You already have an active room allocation'
      });
    }

    // Create room allocation record
    const [allocationResult] = await connection.query(
      'INSERT INTO room_allocations (studentID, roomID, allocatedBy, status) VALUES (?, ?, ?, ?)',
      [studentID, roomID, userID, 'Active']
    );

    // Update room occupancy
    await connection.query(
      'UPDATE rooms SET occupancy = occupancy + 1 WHERE roomID = ?',
      [roomID]
    );

    // Auto-update room status if now fully occupied (TASK 1: Auto-update room status)
    if (room.occupancy + 1 >= room.capacity) {
      await connection.query(
        'UPDATE rooms SET status = ? WHERE roomID = ?',
        ['Occupied', roomID]
      );
    }

    // Commit transaction
    await connection.commit();

    // Log successful allocation
    const processingTime = Date.now() - startTime;
    await logAllocation(studentID, roomID, processingTime, true, 'Room allocated successfully');

    // TODO: Notify student and warden (TASK 2: Notify after allocation)
    console.log(`✅ Room ${room.roomNumber} allocated to student ${studentID}`);

    res.status(201).json({
      success: true,
      message: 'Room allocated successfully',
      data: {
        allocationID: allocationResult.insertId,
        roomNumber: room.roomNumber,
        roomType: room.type,
        allocatedDate: new Date(),
        processingTime: `${processingTime}ms`
      }
    });

  } catch (error) {
    // Rollback on error (TASK 2: Prevent double booking using transaction rollback)
    await connection.rollback();
    
    const processingTime = Date.now() - startTime;
    await logAllocation(req.user.studentID, req.body.roomID, processingTime, false, error.message);
    
    console.error('Allocation error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Room allocation failed',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Get available rooms for student based on their year
 * TASK 1: Fetch available rooms dynamically based on student year and room type eligibility
 */
const getAvailableRooms = async (req, res) => {
  try {
    await ensureReallocationTables();
    await runAutomaticReallocationSweep();

    const studentYear = req.user.year;
    if (studentYear === 'PhD') {
      const [phdRooms] = await db.query(
        `SELECT roomID, roomNumber, type, roomCategory, capacity, occupancy, facilities, status, floor, hostelBlock
         FROM rooms
         WHERE roomCategory = 'PhD' AND status = 'Available' AND occupancy < capacity
         ORDER BY floor, roomNumber`
      );

      if (phdRooms.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No PhD rooms are currently available',
          data: []
        });
      }

      return res.json({
        success: true,
        message: `Found ${phdRooms.length} available PhD rooms`,
        data: phdRooms,
        eligibility: {
          year: studentYear,
          allowedRoomTypes: ['Single', 'Double'],
          roomCategories: ['PhD']
        }
      });
    }

    const regularRule = getRegularTypeCondition(studentYear);
    const [regularRooms] = await db.query(
      `SELECT roomID, roomNumber, type, roomCategory, capacity, occupancy, facilities, status, floor, hostelBlock
       FROM rooms
       WHERE roomCategory = 'Regular' AND status = 'Available' AND occupancy < capacity${regularRule.condition}
       ORDER BY floor, roomNumber`
    );

    if (regularRooms.length > 0) {
      return res.json({
        success: true,
        message: `Found ${regularRooms.length} available regular rooms for ${studentYear} year students`,
        data: regularRooms,
        eligibility: {
          year: studentYear,
          allowedRoomTypes: regularRule.allowedRoomTypes,
          roomCategories: ['Regular']
        }
      });
    }

    const [phdRooms] = await db.query(
      `SELECT roomID, roomNumber, type, roomCategory, capacity, occupancy, facilities, status, floor, hostelBlock
       FROM rooms
       WHERE roomCategory = 'PhD' AND status = 'Available' AND occupancy < capacity
       ORDER BY floor, roomNumber`
    );

    if (phdRooms.length >= PHD_FALLBACK_MIN_AVAILABLE_ROOMS) {
      return res.json({
        success: true,
        message: `No regular eligible rooms are available. Showing PhD fallback rooms (${phdRooms.length} available)`,
        data: phdRooms,
        eligibility: {
          year: studentYear,
          allowedRoomTypes: ['Single', 'Double'],
          roomCategories: ['PhD'],
          fallbackApplied: true,
          fallbackRule: `At least ${PHD_FALLBACK_MIN_AVAILABLE_ROOMS} PhD rooms must be available`
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: `No rooms available for your category. Regular eligible rooms: 0, PhD rooms available: ${phdRooms.length} (minimum ${PHD_FALLBACK_MIN_AVAILABLE_ROOMS} required for fallback)`,
      data: [],
      eligibility: {
        year: studentYear,
        allowedRoomTypes: regularRule.allowedRoomTypes,
        roomCategories: ['Regular']
      }
    });

  } catch (error) {
    console.error('Get available rooms error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available rooms',
      error: error.message
    });
  }
};

/**
 * Get all rooms (for Admin/Warden)
 */
const getAllRooms = async (req, res) => {
  try {
    await ensureReallocationTables();
    await runAutomaticReallocationSweep();

    const { status, type } = req.query;
    
    let query = 'SELECT * FROM rooms WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY hostelBlock, floor, roomNumber';

    const [rooms] = await db.query(query, params);

    res.json({
      success: true,
      data: rooms,
      count: rooms.length
    });

  } catch (error) {
    console.error('Get all rooms error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rooms',
      error: error.message
    });
  }
};

/**
 * Public wrapper for getAllRooms - allows any authenticated user to read room inventory
 */
const getAllRoomsPublic = async (req, res) => {
  try {
    await ensureReallocationTables();
    await runAutomaticReallocationSweep();

    // reuse logic from getAllRooms but do not require admin/warden role
    const { status, type, floor } = req.query;
    let query = 'SELECT roomID, roomNumber, type, roomCategory, capacity, occupancy, facilities, status, floor, hostelBlock FROM rooms WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    if (floor) {
      query += ' AND floor = ?';
      params.push(floor);
    }

    query += ' ORDER BY hostelBlock, floor, roomNumber';

    const [rooms] = await db.query(query, params);

    res.json({
      success: true,
      data: rooms,
      count: rooms.length
    });
  } catch (error) {
    console.error('Get all rooms public error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rooms',
      error: error.message
    });
  }
};

/**
 * Cancel room allocation
 */
const cancelAllocation = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await ensureReallocationTables();

    const { allocationID } = req.params;
    const studentID = req.user.studentID;

    // Begin transaction
    await connection.beginTransaction();

    // Fetch allocation details with lock
    const [allocations] = await connection.query(
      `SELECT ra.allocationID, ra.studentID, ra.roomID, ra.status, ra.allocatedDate,
              s.name AS studentName, u.email AS studentEmail,
              r.roomNumber, r.type AS roomType
       FROM room_allocations ra
       JOIN students s ON s.studentID = ra.studentID
       JOIN users u ON u.userID = s.userID
       JOIN rooms r ON r.roomID = ra.roomID
       WHERE ra.allocationID = ? FOR UPDATE`,
      [allocationID]
    );

    if (allocations.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Allocation not found'
      });
    }

    const allocation = allocations[0];

    // Verify ownership (students can only cancel their own allocations)
    if (req.user.role === 'Student' && allocation.studentID !== studentID) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own allocations'
      });
    }

    // Check if allocation is active
    if (allocation.status !== 'Active') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Allocation is not active'
      });
    }

    // Update allocation status
    await connection.query(
      'UPDATE room_allocations SET status = ?, releaseDate = NOW() WHERE allocationID = ?',
      ['Cancelled', allocationID]
    );

    // Decrease room occupancy
    await connection.query(
      'UPDATE rooms SET occupancy = GREATEST(occupancy - 1, 0) WHERE roomID = ?',
      [allocation.roomID]
    );

    // Update room status to available if occupancy allows
    await connection.query(
      'UPDATE rooms SET status = ? WHERE roomID = ? AND occupancy < capacity',
      ['Available', allocation.roomID]
    );

    const reallocationResult = await processRoomReallocation(connection, allocation.roomID, allocationID);

    // Commit transaction
    await connection.commit();

    await sendRoomAllocationNotifications(reallocationResult.notifications || []);

    try {
      await db.query(
        `INSERT INTO room_notification_logs
         (allocationID, studentID, roomID, eventType, message, emailStatus)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          allocationID,
          allocation.studentID,
          allocation.roomID,
          'Room Cancelled',
          `Room ${allocation.roomNumber} cancelled for ${allocation.studentName}. Email sent to ${allocation.studentEmail}.`,
          'Pending'
        ]
      );
    } catch (logError) {
      console.error('Failed to write room cancellation log:', logError.message);
    }

    try {
      const cancelMailInfo = await sendRoomCancellationEmail({
        toEmail: allocation.studentEmail,
        studentName: allocation.studentName,
        roomNumber: allocation.roomNumber,
        cancelledAt: new Date()
      });

      await db.query(
        `UPDATE room_notification_logs
         SET emailStatus = 'Sent', emailMessageID = ?
         WHERE allocationID = ? AND eventType = 'Room Cancelled'
         ORDER BY notificationLogID DESC
         LIMIT 1`,
        [cancelMailInfo?.messageId || null, allocationID]
      );
    } catch (mailError) {
      console.error('Room cancellation email failed:', mailError.message);
      try {
        await db.query(
          `INSERT INTO room_notification_logs
           (allocationID, studentID, roomID, eventType, message, emailTo, emailStatus)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            allocationID,
            allocation.studentID,
            allocation.roomID,
            'Email Failed',
            `Room ${allocation.roomNumber} cancelled for ${allocation.studentName}, but email failed: ${mailError.message}`,
            allocation.studentEmail,
            'Failed'
          ]
        );
      } catch (logError) {
        console.error('Failed to write room cancellation email failure log:', logError.message);
      }
    }

    res.json({
      success: true,
      message: 'Allocation cancelled successfully',
      autoReallocated: Number(reallocationResult.allocatedCount || 0)
    });

  } catch (error) {
    await connection.rollback();
    console.error('Cancel allocation error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to cancel allocation',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

const joinRoomWaitingList = async (req, res) => {
  try {
    await ensureReallocationTables();

    const studentID = req.user.studentID;
    const studentYear = req.user.year;
    const { roomID, remarks } = req.body;

    if (!roomID) {
      return res.status(400).json({
        success: false,
        message: 'Room ID is required'
      });
    }

    const [roomRows] = await db.query(
      `SELECT roomID, roomNumber, type, roomCategory, capacity, occupancy, status
       FROM rooms
       WHERE roomID = ?
       LIMIT 1`,
      [roomID]
    );

    if (roomRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    const room = roomRows[0];
    const eligible = await isRoomEligibleForStudent(db, room, studentYear);
    if (!eligible) {
      return res.status(400).json({
        success: false,
        message: 'You are not eligible for this room category/type'
      });
    }

    const [activeAllocationRows] = await db.query(
      'SELECT allocationID FROM room_allocations WHERE studentID = ? AND status = ? LIMIT 1',
      [studentID, 'Active']
    );

    if (activeAllocationRows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active allocation and cannot join waiting list'
      });
    }

    const [existingRows] = await db.query(
      `SELECT waitingID
       FROM room_waiting_list
       WHERE studentID = ? AND roomID = ? AND status = 'Pending'
       LIMIT 1`,
      [studentID, roomID]
    );

    if (existingRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'You are already in waiting list for this room'
      });
    }

    const [insertResult] = await db.query(
      `INSERT INTO room_waiting_list (studentID, roomID, status, remarks)
       VALUES (?, ?, 'Pending', ?)`,
      [studentID, roomID, remarks || null]
    );

    await runAutomaticReallocationSweep();

    res.status(201).json({
      success: true,
      message: 'Added to waiting list successfully',
      data: {
        waitingID: insertResult.insertId,
        roomID
      }
    });
  } catch (error) {
    console.error('Join room waiting list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join waiting list',
      error: error.message
    });
  }
};

const getMyWaitingList = async (req, res) => {
  try {
    await ensureReallocationTables();
    await runAutomaticReallocationSweep();

    const studentID = req.user.studentID;

    const [rows] = await db.query(
      `SELECT
        w.waitingID,
        w.roomID,
        w.status,
        w.remarks,
        w.createdAt,
        w.allocatedAt,
        w.cancelledAt,
        r.roomNumber,
        r.type,
        r.roomCategory,
        r.hostelBlock,
        r.floor,
        (
          SELECT COUNT(*)
          FROM room_waiting_list w2
          WHERE w2.roomID = w.roomID
            AND w2.status = 'Pending'
            AND (w2.createdAt < w.createdAt OR (w2.createdAt = w.createdAt AND w2.waitingID <= w.waitingID))
        ) AS queuePosition
      FROM room_waiting_list w
      JOIN rooms r ON r.roomID = w.roomID
      WHERE w.studentID = ?
      ORDER BY w.createdAt DESC`,
      [studentID]
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Get my waiting list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch waiting list',
      error: error.message
    });
  }
};

const cancelMyWaitingEntry = async (req, res) => {
  try {
    await ensureReallocationTables();

    const studentID = req.user.studentID;
    const { waitingID } = req.params;

    const [result] = await db.query(
      `UPDATE room_waiting_list
       SET status = 'Cancelled', cancelledAt = NOW(), updatedAt = NOW(), remarks = COALESCE(remarks, 'Cancelled by student')
       WHERE waitingID = ? AND studentID = ? AND status = 'Pending'`,
      [waitingID, studentID]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pending waiting list entry not found'
      });
    }

    res.json({
      success: true,
      message: 'Waiting list entry cancelled'
    });
  } catch (error) {
    console.error('Cancel waiting entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel waiting list entry',
      error: error.message
    });
  }
};

const getWaitingListAdmin = async (req, res) => {
  try {
    await ensureReallocationTables();
    await runAutomaticReallocationSweep();

    const { status = 'Pending', roomID } = req.query;
    const params = [];
    let whereClause = 'WHERE 1=1';

    if (status && status !== 'All') {
      whereClause += ' AND w.status = ?';
      params.push(status);
    }

    if (roomID) {
      whereClause += ' AND w.roomID = ?';
      params.push(roomID);
    }

    const [rows] = await db.query(
      `SELECT
        w.waitingID,
        w.roomID,
        w.studentID,
        w.status,
        w.remarks,
        w.createdAt,
        w.allocatedAt,
        r.roomNumber,
        r.type,
        r.roomCategory,
        s.name AS studentName,
        s.year,
        s.regNo,
        u.email,
        (
          SELECT COUNT(*)
          FROM room_waiting_list w2
          WHERE w2.roomID = w.roomID
            AND w2.status = 'Pending'
            AND (w2.createdAt < w.createdAt OR (w2.createdAt = w.createdAt AND w2.waitingID <= w.waitingID))
        ) AS queuePosition
      FROM room_waiting_list w
      JOIN rooms r ON r.roomID = w.roomID
      JOIN students s ON s.studentID = w.studentID
      JOIN users u ON u.userID = s.userID
      ${whereClause}
      ORDER BY w.createdAt ASC`,
      params
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Get waiting list admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch waiting list',
      error: error.message
    });
  }
};

const getReallocationLogs = async (req, res) => {
  try {
    await ensureReallocationTables();

    const [rows] = await db.query(
      `SELECT
        l.reallocationLogID,
        l.roomID,
        l.waitingID,
        l.studentID,
        l.triggeredByAllocationID,
        l.newAllocationID,
        l.ruleApplied,
        l.notes,
        l.createdAt,
        r.roomNumber,
        r.type,
        s.name AS studentName,
        s.year,
        s.regNo,
        u.email
      FROM room_reallocation_logs l
      JOIN rooms r ON r.roomID = l.roomID
      JOIN students s ON s.studentID = l.studentID
      JOIN users u ON u.userID = s.userID
      ORDER BY l.createdAt DESC
      LIMIT 200`
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Get reallocation logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reallocation logs',
      error: error.message
    });
  }
};

const triggerReallocationSweep = async (req, res) => {
  try {
    await ensureReallocationTables();
    const result = await runAutomaticReallocationSweep();
    res.json({
      success: true,
      message: 'Reallocation sweep completed',
      data: result
    });
  } catch (error) {
    console.error('Trigger reallocation sweep error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run reallocation sweep',
      error: error.message
    });
  }
};

/**
 * Get allocation history for student
 * TASK 1: Track room allocation history
 */
const getAllocationHistory = async (req, res) => {
  try {
    const studentID = req.user.studentID;

    const [allocations] = await db.query(
      `SELECT 
        ra.allocationID,
        ra.allocatedDate,
        ra.releaseDate,
        ra.status,
        ra.remarks,
        r.roomNumber,
        r.type,
        r.hostelBlock,
        r.floor,
        r.facilities
      FROM room_allocations ra
      JOIN rooms r ON ra.roomID = r.roomID
      WHERE ra.studentID = ?
      ORDER BY ra.allocatedDate DESC`,
      [studentID]
    );

    res.json({
      success: true,
      data: allocations,
      count: allocations.length
    });

  } catch (error) {
    console.error('Get allocation history error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch allocation history',
      error: error.message
    });
  }
};

/**
 * Get current allocation for student
 */
const getCurrentAllocation = async (req, res) => {
  try {
    const studentID = req.user.studentID;

    const [allocations] = await db.query(
      `SELECT 
        ra.allocationID,
        ra.allocatedDate,
        ra.status,
        r.roomID,
        r.roomNumber,
        r.type,
        r.roomCategory,
        r.hostelBlock,
        r.floor,
        r.facilities,
        (
          SELECT GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', ')
          FROM room_allocations roommateRa
          JOIN students s ON roommateRa.studentID = s.studentID
          WHERE roommateRa.roomID = ra.roomID
            AND roommateRa.status = 'Active'
            AND roommateRa.studentID <> ra.studentID
        ) AS roommateNames
      FROM room_allocations ra
      JOIN rooms r ON ra.roomID = r.roomID
      WHERE ra.studentID = ? AND ra.status = 'Active'
      LIMIT 1`,
      [studentID]
    );

    if (allocations.length === 0) {
      return res.json({
        success: true,
        message: 'No active allocation found',
        data: null
      });
    }

    res.json({
      success: true,
      data: allocations[0]
    });

  } catch (error) {
    console.error('Get current allocation error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch current allocation',
      error: error.message
    });
  }
};

/**
 * BOOKING REQUEST SUBMISSION
 * Create a detailed booking request with start date, duration, food status, and fees
 */
const submitBookingRequest = async (req, res) => {
  try {
    const {
      roomID,
      startDate,
      duration,
      noOfSeaters,
      foodRequired,
      foodCost,
      isAmountPaid
    } = req.body;
    
    const studentID = req.user.studentID;
    const studentYear = req.user.year;

    // Validate required fields
    if (!roomID || !startDate || !duration || !noOfSeaters) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: roomID, startDate, duration, noOfSeaters'
      });
    }

    // Validate startDate is not in the past
    const requestedDate = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (requestedDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be in the past'
      });
    }

    // Validate duration is positive
    if (duration <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be greater than 0'
      });
    }

    // Validate room exists
    const [rooms] = await db.query('SELECT roomID, roomNumber, type, roomCategory FROM rooms WHERE roomID = ?', [roomID]);
    if (rooms.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    const room = rooms[0];

    if (studentYear === 'PhD' && room.roomCategory !== 'PhD') {
      return res.status(400).json({
        success: false,
        message: 'PhD scholars can only book PhD rooms'
      });
    }

    if (studentYear !== 'PhD' && room.roomCategory === 'PhD') {
      const fallbackEligibility = await canUsePhDRoomFallback(db, studentYear);
      if (!fallbackEligibility.canUseFallback) {
        return res.status(400).json({
          success: false,
          message: `PhD rooms can only be booked when no regular eligible rooms are available and at least ${PHD_FALLBACK_MIN_AVAILABLE_ROOMS} PhD rooms are free`
        });
      }
    }

    if (studentYear === 'Final' && room.type !== 'Single') {
      return res.status(400).json({
        success: false,
        message: 'Final year students can only book Single rooms'
      });
    }

    if (studentYear === 'Third' && room.type !== 'Double') {
      return res.status(400).json({
        success: false,
        message: 'Third year students can only book Double rooms'
      });
    }
    const fixedMonthlyFee = room.roomCategory === 'PhD'
      ? FIXED_MONTHLY_FEE.PhD
      : FIXED_MONTHLY_FEE[room.type];

    if (!fixedMonthlyFee) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported room type for fixed fee calculation'
      });
    }

    // Calculate total amount
    const normalizedFoodRequired = foodRequired === true || foodRequired === 'true' || foodRequired === '1' || foodRequired === 1;
    const normalizedIsAmountPaid = isAmountPaid === true || isAmountPaid === 'true' || isAmountPaid === '1' || isAmountPaid === 1;
    const parsedFoodCost = Number(foodCost) || 0;
    const parsedDuration = Number(duration) || 0;
    const parsedNoOfSeaters = Number(noOfSeaters) || 0;

    const foodCostValue = normalizedFoodRequired ? parsedFoodCost : 0;
    const totalAmount = (fixedMonthlyFee * (parsedDuration / 30)) + foodCostValue;
    const paymentStatus = normalizedIsAmountPaid ? 'Paid' : 'Unpaid';
    const paidAtValue = normalizedIsAmountPaid ? new Date() : null;
    const paymentProofPath = null;
    const paymentProofOriginalName = null;
    const paymentProofMimeType = null;

    // Insert booking request
    const [result] = await db.query(
      `INSERT INTO booking_requests 
       (studentID, roomID, startDate, duration, noOfSeaters, foodRequired, foodCost, monthlyFee, totalAmount, paymentStatus, paidAt, receiptPath, receiptOriginalName, receiptMimeType, paymentProofPath, paymentProofOriginalName, paymentProofMimeType, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [studentID, roomID, startDate, parsedDuration, parsedNoOfSeaters, normalizedFoodRequired ? 1 : 0, foodCostValue, fixedMonthlyFee, totalAmount, paymentStatus, paidAtValue, null, null, null, paymentProofPath, paymentProofOriginalName, paymentProofMimeType]
    );

    const generatedReceipt = await generateBookingReceiptPdf({
      bookingID: result.insertId,
      studentID,
      roomNumber: room.roomNumber,
      roomType: room.type,
      roomCategory: room.roomCategory,
      startDate,
      duration: parsedDuration,
      monthlyFee: fixedMonthlyFee,
      totalAmount,
      paymentStatus
    });

    const receiptPath = generatedReceipt.receiptPath;
    const receiptOriginalName = generatedReceipt.receiptOriginalName;
    const receiptMimeType = generatedReceipt.receiptMimeType;

    await db.query(
      'UPDATE booking_requests SET receiptPath = ?, receiptOriginalName = ?, receiptMimeType = ? WHERE bookingID = ?',
      [receiptPath, receiptOriginalName, receiptMimeType, result.insertId]
    );

    const transactionReference = generateBookingTransactionReference();
    const normalizedPaymentMethod = normalizedIsAmountPaid ? 'Online' : 'Manual/Receipt Upload';

    await db.query(
      `INSERT INTO booking_payment_transactions
       (transactionReference, bookingID, studentID, amount, paymentStatus, paymentMethod, receiptPath, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transactionReference,
        result.insertId,
        studentID,
        totalAmount,
        paymentStatus === 'Paid' ? 'Paid' : 'Pending',
        normalizedPaymentMethod,
        receiptPath,
        'Transaction created automatically at booking submission'
      ]
    );

    try {
      const [studentRows] = await db.query(
        `SELECT s.name, s.phoneNumber
         FROM students s
         WHERE s.studentID = ?
         LIMIT 1`,
        [studentID]
      );

      const student = studentRows[0];
      const appBaseUrl = process.env.BACKEND_PUBLIC_URL || 'http://localhost:5000';
      await sendBookingConfirmationWhatsApp({
        phoneNumber: student?.phoneNumber,
        studentName: student?.name,
        bookingID: result.insertId,
        roomNumber: room.roomNumber,
        roomType: room.type,
        totalAmount,
        receiptUrl: `${appBaseUrl}${receiptPath}`
      });
    } catch (whatsappError) {
      console.error('Booking confirmation WhatsApp send failed:', whatsappError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Booking request submitted successfully',
      bookingID: result.insertId,
      data: {
        bookingID: result.insertId,
        roomID,
        startDate,
        duration,
        noOfSeaters,
        foodRequired: normalizedFoodRequired,
        monthlyFee: fixedMonthlyFee,
        totalAmount,
        transactionReference,
        paymentStatus,
        paidAt: paidAtValue,
        receiptPath,
        receiptOriginalName,
        receiptMimeType,
        paymentProofPath,
        paymentProofOriginalName,
        status: 'Pending'
      }
    });

  } catch (error) {
    console.error('Booking request submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit booking request',
      error: error.message
    });
  }
};

/**
 * GET BOOKING REQUESTS
 * Retrieve all booking requests for current student
 */
const getMyBookingRequests = async (req, res) => {
  try {
    const studentID = req.user.studentID;

    const [bookings] = await db.query(
      `SELECT br.*, r.roomNumber, r.type, r.capacity,
              bpt.transactionReference, bpt.paymentMethod AS transactionPaymentMethod,
              bpt.paymentStatus AS transactionPaymentStatus, bpt.createdAt AS transactionCreatedAt
       FROM booking_requests br
       JOIN rooms r ON br.roomID = r.roomID
       LEFT JOIN booking_payment_transactions bpt ON bpt.bookingID = br.bookingID
       WHERE br.studentID = ?
       ORDER BY br.createdAt DESC`,
      [studentID]
    );

    res.status(200).json({
      success: true,
      data: bookings
    });

  } catch (error) {
    console.error('Get booking requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking requests',
      error: error.message
    });
  }
};

/**
 * GET ALL BOOKING REQUESTS (ADMIN/WARDEN)
 * Retrieve booking requests with student and room details
 */
const getAllBookingRequests = async (req, res) => {
  try {
    const { status, paymentStatus } = req.query;
    const params = [];
    const whereClauses = [];

    if (status && status !== 'All') {
      whereClauses.push('br.status = ?');
      params.push(status);
    }

    if (paymentStatus && paymentStatus !== 'All') {
      whereClauses.push('br.paymentStatus = ?');
      params.push(paymentStatus);
    }

    const whereClause = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [bookings] = await db.query(
      `SELECT br.*, r.roomNumber, r.type, r.roomCategory, r.capacity, r.hostelBlock, r.floor,
              s.name AS studentName, s.year, u.email,
              bpt.transactionReference, bpt.paymentMethod AS transactionPaymentMethod,
              bpt.paymentStatus AS transactionPaymentStatus, bpt.createdAt AS transactionCreatedAt
       FROM booking_requests br
       JOIN rooms r ON br.roomID = r.roomID
       JOIN students s ON br.studentID = s.studentID
       JOIN users u ON s.userID = u.userID
       LEFT JOIN booking_payment_transactions bpt ON bpt.bookingID = br.bookingID
       ${whereClause}
       ORDER BY br.createdAt DESC`,
      params
    );

    res.status(200).json({
      success: true,
      data: bookings
    });
  } catch (error) {
    console.error('Get all booking requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking requests',
      error: error.message
    });
  }
};

/**
 * APPROVE BOOKING REQUEST (ADMIN/WARDEN)
 * Allocate room and mark booking as approved
 */
const approveBookingRequest = async (req, res) => {
  const connection = await db.getConnection();
  const startTime = Date.now();

  try {
    const { bookingID } = req.params;
    const { remarks } = req.body || {};
    const userID = req.user.userID;

    await connection.beginTransaction();

    const [bookingRows] = await connection.query(
      `SELECT br.*, r.roomNumber, r.type AS roomType, r.roomCategory, r.capacity, r.occupancy, r.status AS roomStatus,
              s.year AS studentYear
       FROM booking_requests br
       JOIN rooms r ON br.roomID = r.roomID
       JOIN students s ON br.studentID = s.studentID
       WHERE br.bookingID = ?
       FOR UPDATE`,
      [bookingID]
    );

    if (bookingRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Booking request not found'
      });
    }

    const booking = bookingRows[0];

    if (booking.status !== 'Pending') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Only pending booking requests can be approved'
      });
    }

    if (booking.roomStatus !== 'Available' || booking.occupancy >= booking.capacity) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Room is not available'
      });
    }

    if (booking.studentYear === 'Final' && booking.roomType !== 'Single') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Final year students can only book Single rooms'
      });
    }

    if (booking.studentYear === 'Third' && booking.roomType !== 'Double') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Third year students can only book Double rooms'
      });
    }

    if (booking.studentYear === 'PhD' && booking.roomCategory !== 'PhD') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'PhD scholars can only book PhD rooms'
      });
    }

    if (booking.studentYear !== 'PhD' && booking.roomCategory === 'PhD') {
      const fallbackEligibility = await canUsePhDRoomFallback(connection, booking.studentYear);
      if (!fallbackEligibility.canUseFallback) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `PhD rooms can only be booked when no regular eligible rooms are available and at least ${PHD_FALLBACK_MIN_AVAILABLE_ROOMS} PhD rooms are free`
        });
      }
    }

    const [existingAllocations] = await connection.query(
      'SELECT allocationID FROM room_allocations WHERE studentID = ? AND status = ?'
      , [booking.studentID, 'Active']
    );

    if (existingAllocations.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Student already has an active room allocation'
      });
    }

    const [allocationResult] = await connection.query(
      'INSERT INTO room_allocations (studentID, roomID, allocatedBy, status, remarks) VALUES (?, ?, ?, ?, ?)',
      [booking.studentID, booking.roomID, userID, 'Active', remarks || 'Approved booking request']
    );

    await connection.query(
      'UPDATE rooms SET occupancy = occupancy + 1 WHERE roomID = ?',
      [booking.roomID]
    );

    if (booking.occupancy + 1 >= booking.capacity) {
      await connection.query(
        'UPDATE rooms SET status = ? WHERE roomID = ?',
        ['Occupied', booking.roomID]
      );
    }

    await connection.query(
      'UPDATE booking_requests SET status = ?, remarks = ? WHERE bookingID = ?',
      ['Approved', remarks || null, bookingID]
    );

    await connection.commit();

    const processingTime = Date.now() - startTime;
    await logAllocation(booking.studentID, booking.roomID, processingTime, true, 'Approved booking request');

    try {
      const [studentRows] = await db.query(
        `SELECT s.name, s.phoneNumber
         FROM students s
         WHERE s.studentID = ?
         LIMIT 1`,
        [booking.studentID]
      );

      const student = studentRows[0];
      const appBaseUrl = process.env.BACKEND_PUBLIC_URL || 'http://localhost:5000';
      await sendBookingDecisionWhatsApp({
        phoneNumber: student?.phoneNumber,
        studentName: student?.name,
        bookingID,
        roomNumber: booking.roomNumber,
        decision: 'Approved',
        remarks: remarks || 'Approved booking request',
        receiptUrl: `${appBaseUrl}${booking.receiptPath || ''}`
      });
    } catch (whatsappError) {
      console.error('Booking approval WhatsApp send failed:', whatsappError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Booking request approved and room allocated',
      data: {
        bookingID,
        allocationID: allocationResult.insertId,
        roomNumber: booking.roomNumber
      }
    });
  } catch (error) {
    await connection.rollback();
    const processingTime = Date.now() - startTime;
    await logAllocation(req.body?.studentID || null, req.body?.roomID || null, processingTime, false, error.message);
    console.error('Approve booking request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve booking request',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * REJECT BOOKING REQUEST (ADMIN/WARDEN)
 */
const rejectBookingRequest = async (req, res) => {
  try {
    const { bookingID } = req.params;
    const { remarks } = req.body || {};

    const [bookingRows] = await db.query(
      `SELECT br.bookingID, br.studentID, br.receiptPath, r.roomNumber
       FROM booking_requests br
       JOIN rooms r ON br.roomID = r.roomID
       WHERE br.bookingID = ?
       LIMIT 1`,
      [bookingID]
    );

    const booking = bookingRows[0];

    const [result] = await db.query(
      'UPDATE booking_requests SET status = ?, remarks = ? WHERE bookingID = ? AND status = ?'
      , ['Rejected', remarks || null, bookingID, 'Pending']
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pending booking request not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Booking request rejected'
    });

    try {
      if (booking?.studentID) {
        const [studentRows] = await db.query(
          `SELECT s.name, s.phoneNumber
           FROM students s
           WHERE s.studentID = ?
           LIMIT 1`,
          [booking.studentID]
        );

        const student = studentRows[0];
        await sendBookingDecisionWhatsApp({
          phoneNumber: student?.phoneNumber,
          studentName: student?.name,
          bookingID,
          roomNumber: booking.roomNumber,
          decision: 'Rejected',
          remarks: remarks || 'Rejected booking request'
        });
      }
    } catch (whatsappError) {
      console.error('Booking rejection WhatsApp send failed:', whatsappError.message);
    }
  } catch (error) {
    console.error('Reject booking request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject booking request',
      error: error.message
    });
  }
};

/**
 * GET BOOKING PAYMENT TRANSACTIONS (STUDENT)
 * Returns booking payment transaction history for logged-in student
 */
const getMyBookingPaymentTransactions = async (req, res) => {
  try {
    const studentID = req.user.studentID;

    const [transactions] = await db.query(
      `SELECT bpt.transactionID, bpt.transactionReference, bpt.bookingID, bpt.amount,
              bpt.paymentStatus, bpt.paymentMethod, bpt.receiptPath, bpt.notes,
              bpt.createdAt, bpt.updatedAt,
              br.roomID, br.startDate, br.duration, br.status AS bookingStatus,
              r.roomNumber, r.type AS roomType, r.roomCategory
       FROM booking_payment_transactions bpt
       JOIN booking_requests br ON bpt.bookingID = br.bookingID
       JOIN rooms r ON br.roomID = r.roomID
       WHERE bpt.studentID = ?
       ORDER BY bpt.createdAt DESC`,
      [studentID]
    );

    res.status(200).json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Get booking payment transaction history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking payment transaction history',
      error: error.message
    });
  }
};

/**
 * Helper function to log allocation processing time
 * TASK 3: Log allocation processing time
 */
const logAllocation = async (studentID, roomID, processingTime, success, message) => {
  try {
    await db.query(
      'INSERT INTO allocation_logs (studentID, roomID, processingTime, success, message) VALUES (?, ?, ?, ?, ?)',
      [studentID, roomID, processingTime, success, message]
    );
  } catch (error) {
    console.error('Error logging allocation:', error);
  }
};

module.exports = {
  allocateRoom,
  getAvailableRooms,
  getAllRooms,
  cancelAllocation,
  joinRoomWaitingList,
  getMyWaitingList,
  cancelMyWaitingEntry,
  getWaitingListAdmin,
  getReallocationLogs,
  triggerReallocationSweep,
  getAllocationHistory,
  getCurrentAllocation,
  submitBookingRequest,
  getMyBookingRequests,
  getAllBookingRequests,
  approveBookingRequest,
  rejectBookingRequest,
  getMyBookingPaymentTransactions,
  getAllRoomsPublic
};
