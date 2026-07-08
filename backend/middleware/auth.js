/**
 * AUTHENTICATION MIDDLEWARE
 * Verifies JWT token on every protected request
 * Implements TASK 1: JWT verification for protected routes
 */

const { verifyToken } = require('../utils/tokenManager');
const db = require('../config/db');

/**
 * Middleware to verify JWT token
 * Extracts token from Authorization header and validates it
 * Attaches user information to req.user for downstream use
 */
const verifyJWT = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Extract token (remove 'Bearer ' prefix)
    const token = authHeader.substring(7);

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Verify user still exists in database
    const [users] = await db.query(
      'SELECT userID, email, role FROM users WHERE userID = ?',
      [decoded.userID]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    let specializedCategory = null;
    if (users[0].role === 'Admin') {
      try {
        await db.query(`
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

        const [specializationRows] = await db.query(
          'SELECT complaintCategory FROM admin_specializations WHERE userID = ? LIMIT 1',
          [users[0].userID]
        );
        specializedCategory = specializationRows.length ? specializationRows[0].complaintCategory : null;
      } catch (specializationError) {
        console.error('Admin specialization lookup error:', specializationError.message);
      }
    }

    // Attach user info to request object
    req.user = {
      userID: users[0].userID,
      email: users[0].email,
      role: users[0].role,
      specializedCategory
    };

    // Continue to next middleware/route handler
    next();

  } catch (error) {
    console.error('JWT verification error:', error);
    
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 * Used for routes that work with or without authentication
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);

      if (decoded) {
        req.user = {
          userID: decoded.userID,
          email: decoded.email,
          role: decoded.role,
          specializedCategory: decoded.specializedCategory || null
        };
      }
    }

    next();

  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  verifyJWT,
  optionalAuth
};
