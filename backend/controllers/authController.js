/**
 * AUTHENTICATION CONTROLLER
 * Handles user registration, login, password reset, and session management
 * Implements MODULE 1: User Authentication & Access Management
 */

const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const db = require('../config/db');
const { sendPasswordResetWhatsApp } = require('../utils/whatsappNotifier');
const { 
  validateEmail, 
  validatePassword, 
  validateRole, 
  validateYear,
  sanitizeInput 
} = require('../utils/validators');
const { 
  generateAccessToken, 
  generateResetToken, 
  getTokenExpiration 
} = require('../utils/tokenManager');

const ensureAdminSpecializationTable = async (connectionOrDb = db) => {
  await connectionOrDb.query(`
    CREATE TABLE IF NOT EXISTS admin_specializations (
      specializationID INT AUTO_INCREMENT PRIMARY KEY,
      userID INT NOT NULL UNIQUE,
      complaintCategory ENUM('Food Issue', 'Safety', 'Health') NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE,
      INDEX idx_complaint_category (complaintCategory)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
};

const sendPasswordResetEmail = async ({ toEmail, resetToken }) => {
  const {
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_USER,
    EMAIL_PASSWORD,
    EMAIL_FROM
  } = process.env;

  const smtpPassword = String(EMAIL_PASSWORD || '').replace(/\s+/g, '');

  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !smtpPassword) {
    throw new Error('Email SMTP settings are missing in backend .env');
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

  const appBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetLink = `${appBaseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

  await transporter.sendMail({
    from: EMAIL_FROM || EMAIL_USER,
    to: toEmail,
    subject: 'Hostel Management - Password Reset',
    text: `Use this link to reset your password: ${resetLink}\n\nIf you did not request this, ignore this email.`,
    html: `
      <p>Hello,</p>
      <p>You requested a password reset for Hostel Management System.</p>
      <p>
        Click this link to reset your password:<br/>
        <a href="${resetLink}">${resetLink}</a>
      </p>
      <p>This link/token is valid for 1 hour.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `
  });
};

/**
 * TASK 1: User Registration
 * Register a new user with email, password, and role
 */
const register = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
      await ensureAdminSpecializationTable(connection);

    const { email, password, role, name, year, department, phoneNumber, guardianContact, adminSpecialization, regNo, isExService, isCurrentStaff } = req.body;

    // ===== VALIDATION =====
    
    // Validate required fields
    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and role are required'
      });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate password strength (min 8 chars, 1 digit, 1 special char)
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // Validate role
    if (!validateRole(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be Student, Warden, or Admin'
      });
    }

    // Additional validation for Student role
    if (role === 'Student') {
      if (!name || !year || !regNo || !String(regNo).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Name, year, and register number are required for student registration'
        });
      }

      if (!validateYear(year)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid year. Must be First, Second, Third, Final, or PhD'
        });
      }
    }

    // ===== CHECK DUPLICATE EMAIL =====
    const [existingUsers] = await connection.query(
      'SELECT email FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // ===== CHECK DUPLICATE REGISTER NUMBER FOR STUDENT =====
    if (role === 'Student') {
      const normalizedRegNo = String(regNo).trim();
      const exServiceValue = isExService === true || isExService === 'true' || isExService === 1 || isExService === '1';
      const currentStaffValue = isCurrentStaff === true || isCurrentStaff === 'true' || isCurrentStaff === 1 || isCurrentStaff === '1';
      
      // Validation: Both flags cannot be true
      if (exServiceValue && currentStaffValue) {
        return res.status(400).json({
          success: false,
          message: 'Cannot select both Ex-Service and Current Staff options'
        });
      }

      // Calculate fee based on category
      let hostelFee;
      if (exServiceValue) {
        hostelFee = 0; // Ex-Service: 100% free
      } else if (currentStaffValue) {
        hostelFee = 2500; // Current Staff: 50% discount
      } else {
        hostelFee = 5000; // Regular: full fee
      }

      const [existingRegNos] = await connection.query(
        'SELECT studentID FROM students WHERE regNo = ? LIMIT 1',
        [normalizedRegNo]
      );

      if (existingRegNos.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Register number already exists'
        });
      }
    }

    // ===== HASH PASSWORD USING BCRYPT =====
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // ===== BEGIN TRANSACTION =====
    await connection.beginTransaction();

    // Insert user record
    const [userResult] = await connection.query(
      'INSERT INTO users (email, hashedPassword, role) VALUES (?, ?, ?)',
      [email, hashedPassword, role]
    );

    const userID = userResult.insertId;

    // If role is Student, insert student record
    if (role === 'Student') {
      const normalizedRegNo = String(regNo).trim();
      const exServiceValue = isExService === true || isExService === 'true' || isExService === 1 || isExService === '1';
      const currentStaffValue = isCurrentStaff === true || isCurrentStaff === 'true' || isCurrentStaff === 1 || isCurrentStaff === '1';
      
      // Calculate fee based on category
      let hostelFee;
      if (exServiceValue) {
        hostelFee = 0; // Ex-Service: 100% free
      } else if (currentStaffValue) {
        hostelFee = 2500; // Current Staff: 50% discount
      } else {
        hostelFee = 5000; // Regular: full fee
      }

      await connection.query(
        'INSERT INTO students (userID, regNo, hostelID, isExService, isCurrentStaff, hostelFee, name, year, department, phoneNumber, guardianContact) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [userID, normalizedRegNo, null, exServiceValue, currentStaffValue, hostelFee, sanitizeInput(name), year, sanitizeInput(department) || null, phoneNumber || null, guardianContact || null]
      );
    }

    // If role is Admin and specialization is provided, save mapping for dedicated dashboard routing.
    if (role === 'Admin' && adminSpecialization) {
      const allowedSpecializations = ['Food Issue', 'Safety', 'Health'];
      if (!allowedSpecializations.includes(adminSpecialization)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Invalid admin specialization. Allowed: Food Issue, Safety, Health'
        });
      }

      await connection.query(
        'INSERT INTO admin_specializations (userID, complaintCategory) VALUES (?, ?)',
        [userID, adminSpecialization]
      );
    }

    // Commit transaction
    await connection.commit();

    // Generate JWT token
    const token = generateAccessToken({
      userID,
      email,
      role,
      specializedCategory: role === 'Admin' ? adminSpecialization || null : null
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        userID,
        email,
        role,
        regNo: role === 'Student' ? String(regNo).trim() : null,
        isExService: role === 'Student' ? (isExService === true || isExService === 'true' || isExService === 1 || isExService === '1') : false,
        isCurrentStaff: role === 'Student' ? (isCurrentStaff === true || isCurrentStaff === 'true' || isCurrentStaff === 1 || isCurrentStaff === '1') : false,
        hostelFee: role === 'Student' ? (() => {
          const ex = isExService === true || isExService === 'true' || isExService === 1 || isExService === '1';
          const cs = isCurrentStaff === true || isCurrentStaff === 'true' || isCurrentStaff === 1 || isCurrentStaff === '1';
          if (ex) return 0;
          if (cs) return 2500;
          return 5000;
        })() : null,
        specializedCategory: role === 'Admin' ? adminSpecialization || null : null,
        token
      }
    });

  } catch (error) {
    // Rollback transaction on error
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.warn('Rollback failed (transaction may not have started):', rollbackError.message);
    }
    console.error('Registration error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  } finally {
    try {
      connection.release();
    } catch (releaseError) {
      console.warn('Connection release failed:', releaseError.message);
    }
  }
};

/**
 * TASK 1: User Login
 * Authenticate user and generate JWT token
 */
const login = async (req, res) => {
  try {
      await ensureAdminSpecializationTable(db);

    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Fetch user from database
    const [users] = await db.query(
      'SELECT userID, email, hashedPassword, role FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = users[0];
    let regNo = null;
    let hostelID = null;
    let isExServiceStudent = false;
    let isCurrentStaffStudent = false;
    let hostelFee = null;

    if (user.role === 'Student') {
      const [studentRows] = await db.query(
        'SELECT regNo, hostelID, isExService, isCurrentStaff, hostelFee FROM students WHERE userID = ? LIMIT 1',
        [user.userID]
      );
      if (studentRows.length) {
        regNo = studentRows[0].regNo;
        hostelID = studentRows[0].hostelID;
        isExServiceStudent = Boolean(studentRows[0].isExService);
        isCurrentStaffStudent = Boolean(studentRows[0].isCurrentStaff);
        hostelFee = Number(studentRows[0].hostelFee);
      }
    }

    let specializedCategory = null;
    if (user.role === 'Admin') {
      const [specializationRows] = await db.query(
        'SELECT complaintCategory FROM admin_specializations WHERE userID = ? LIMIT 1',
        [user.userID]
      );
      specializedCategory = specializationRows.length ? specializationRows[0].complaintCategory : null;
    }

    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Load role permissions dynamically (TASK 2: RBAC)
    const [permissions] = await db.query(
      'SELECT resource, action FROM role_permissions WHERE role = ?',
      [user.role]
    );

    // Generate JWT token
    const token = generateAccessToken({
      userID: user.userID,
      email: user.email,
      role: user.role,
      specializedCategory
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        userID: user.userID,
        email: user.email,
        role: user.role,
        regNo,
        hostelID,
        isExService: isExServiceStudent,
        isCurrentStaff: isCurrentStaffStudent,
        hostelFee,
        specializedCategory,
        permissions,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

/**
 * TASK 3: Forgot Password - Request Reset
 * Generate reset token and send via email
 */
const forgotPassword = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { email } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Valid email is required'
      });
    }

    // Check if user exists and get phone number if available
    const [users] = await connection.query(
      `SELECT u.userID, u.email, u.role, s.phoneNumber, s.name
       FROM users u
       LEFT JOIN students s ON u.userID = s.userID
       WHERE u.email = ?`,
      [email]
    );

    if (users.length === 0) {
      // Don't reveal if email exists for security
      return res.json({
        success: true,
        message: 'If email exists, password reset link has been sent'
      });
    }

    const user = users[0];
    const userID = user.userID;

    // Generate reset token
    const resetToken = generateResetToken();
    const expiresAt = getTokenExpiration(1); // 1 hour expiration

    // Store token in database
    await connection.query(
      'INSERT INTO password_reset_tokens (userID, token, expiresAt) VALUES (?, ?, ?)',
      [userID, resetToken, expiresAt]
    );

    let emailSent = false;
    let whatsappSent = false;

    if (user.phoneNumber) {
      try {
        const appBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetLink = `${appBaseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
        const whatsappResult = await sendPasswordResetWhatsApp({
          phoneNumber: user.phoneNumber,
          studentName: user.name,
          resetLink
        });
        whatsappSent = Boolean(whatsappResult?.sent);
      } catch (whatsAppError) {
        console.error('Password reset WhatsApp send failed:', whatsAppError.message);
      }
    }

    if (!whatsappSent) {
      try {
        await sendPasswordResetEmail({ toEmail: email, resetToken });
        emailSent = true;
      } catch (mailError) {
        console.error('Password reset email send failed:', mailError.message);
      }
    }
    res.json({
      success: true,
      message: 'If email exists, password reset link has been sent',
      emailSent,
      // Keep test token in development only (useful when SMTP is not configured)
      whatsappSent,
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Password reset request failed',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * TASK 3: Reset Password
 * Validate token and update password
 */
const resetPassword = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // Validate token
    const [tokens] = await connection.query(
      'SELECT userID, expiresAt, used FROM password_reset_tokens WHERE token = ?',
      [token]
    );

    if (tokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    const resetRecord = tokens[0];

    // Check if token is expired
    if (new Date() > new Date(resetRecord.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'Token has expired'
      });
    }

    // Check if token already used
    if (resetRecord.used) {
      return res.status(400).json({
        success: false,
        message: 'Token has already been used'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Begin transaction
    await connection.beginTransaction();

    // Update password
    await connection.query(
      'UPDATE users SET hashedPassword = ? WHERE userID = ?',
      [hashedPassword, resetRecord.userID]
    );

    // Mark token as used
    await connection.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE token = ?',
      [token]
    );

    // Commit transaction
    await connection.commit();

    res.json({
      success: true,
      message: 'Password reset successful. Please login with new password.'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Reset password error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Password reset failed',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * TASK 3: Logout
 * Invalidate session (client-side token removal)
 */
const logout = async (req, res) => {
  try {
    // In a stateless JWT setup, logout is handled client-side
    // by removing the token from storage
    
    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    const userID = req.user.userID;

    // Fetch user details
    const [users] = await db.query(
      'SELECT userID, email, role, createdAt FROM users WHERE userID = ?',
      [userID]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];

    // If student, fetch additional details
    if (user.role === 'Student') {
      const [students] = await db.query(
        'SELECT studentID, regNo, hostelID, isExService, isCurrentStaff, hostelFee, name, year, department, phoneNumber, guardianContact FROM students WHERE userID = ?',
        [userID]
      );

      if (students.length > 0) {
        user.studentDetails = students[0];
        user.regNo = students[0].regNo;
        user.hostelID = students[0].hostelID;
        user.isExService = Boolean(students[0].isExService);
        user.isCurrentStaff = Boolean(students[0].isCurrentStaff);
        user.hostelFee = Number(students[0].hostelFee);
      }
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Get profile error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  logout,
  getProfile
};
