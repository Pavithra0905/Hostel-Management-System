/**
 * ROLE-BASED ACCESS CONTROL (RBAC) MIDDLEWARE
 * Implements TASK 2: Role-permission mapping and access control
 * Checks if user has required role/permission before executing endpoint
 */

const db = require('../config/db');

/**
 * Middleware to check if user has required role
 * @param {Array<string>} allowedRoles - Array of roles allowed to access the route
 * @returns {Function} - Express middleware function
 * 
 * Usage: router.get('/admin-only', checkRole(['Admin']), handler)
 */
const checkRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated (should be set by verifyJWT middleware)
      if (!req.user || !req.user.role) {
        // Log unauthorized access attempt
        await logUnauthorizedAccess(
          req.user?.userID || null,
          req.originalUrl,
          req.ip,
          'No role found in request'
        );

        return res.status(403).json({
          success: false,
          message: 'Access denied. Authentication required.'
        });
      }

      // Check if user's role is in allowed roles
      if (!allowedRoles.includes(req.user.role)) {
        // Log unauthorized access attempt (TASK 2: Log unauthorized attempts)
        await logUnauthorizedAccess(
          req.user.userID,
          req.originalUrl,
          req.ip,
          `Role ${req.user.role} not authorized for this endpoint`
        );

        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.',
          requiredRoles: allowedRoles,
          userRole: req.user.role
        });
      }

      // User has required role, proceed to next middleware/handler
      next();

    } catch (error) {
      console.error('Role check error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Authorization check failed',
        error: error.message
      });
    }
  };
};

/**
 * Middleware to check if user has specific permission
 * Checks against role_permissions table
 * @param {string} resource - Resource being accessed (e.g., 'rooms', 'allocations')
 * @param {string} action - Action being performed (e.g., 'create', 'read', 'update', 'delete')
 * @returns {Function} - Express middleware function
 * 
 * Usage: router.post('/rooms', checkPermission('rooms', 'create'), handler)
 */
const checkPermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.user || !req.user.role) {
        await logUnauthorizedAccess(
          req.user?.userID || null,
          req.originalUrl,
          req.ip,
          'No authentication found'
        );

        return res.status(403).json({
          success: false,
          message: 'Access denied. Authentication required.'
        });
      }

      // Check if role has permission for this resource and action
      const [permissions] = await db.query(
        'SELECT * FROM role_permissions WHERE role = ? AND resource = ? AND action = ?',
        [req.user.role, resource, action]
      );

      if (permissions.length === 0) {
        // Log unauthorized access attempt
        await logUnauthorizedAccess(
          req.user.userID,
          req.originalUrl,
          req.ip,
          `Permission denied: ${resource}.${action} for role ${req.user.role}`
        );

        return res.status(403).json({
          success: false,
          message: `Access denied. You don't have permission to ${action} ${resource}.`,
          requiredPermission: { resource, action },
          userRole: req.user.role
        });
      }

      // User has required permission, proceed
      next();

    } catch (error) {
      console.error('Permission check error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Permission check failed',
        error: error.message
      });
    }
  };
};

/**
 * Helper function to log unauthorized access attempts
 * TASK 2: Log unauthorized access with timestamp, userID, endpoint, IP address
 * @param {number|null} userID - User ID attempting access
 * @param {string} endpoint - Endpoint being accessed
 * @param {string} ipAddress - IP address of requester
 * @param {string} reason - Reason for denial
 */
const logUnauthorizedAccess = async (userID, endpoint, ipAddress, reason) => {
  try {
    await db.query(
      'INSERT INTO unauthorized_access_logs (userID, endpoint, ipAddress, reason) VALUES (?, ?, ?, ?)',
      [userID, endpoint, ipAddress, reason]
    );
    
    console.log(`⚠️ Unauthorized access attempt: UserID=${userID}, Endpoint=${endpoint}, IP=${ipAddress}`);
  } catch (error) {
    console.error('Error logging unauthorized access:', error);
  }
};

/**
 * Middleware to check if user is a student and fetch their studentID
 * Attaches studentID to req.user for easy access
 */
const requireStudent = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'Student') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Students only.'
      });
    }

    // Fetch studentID
    const [students] = await db.query(
      'SELECT studentID, year FROM students WHERE userID = ?',
      [req.user.userID]
    );

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found'
      });
    }

    // Attach student info to request
    req.user.studentID = students[0].studentID;
    req.user.year = students[0].year;

    next();

  } catch (error) {
    console.error('Student check error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Student verification failed',
      error: error.message
    });
  }
};

module.exports = {
  checkRole,
  checkPermission,
  requireStudent,
  logUnauthorizedAccess
};
