/**
 * ADMIN ROUTES
 * Routes for admin dashboard, reports, and monitoring
 * TASK 3: Admin reports and analytics
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyJWT } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// All admin routes require Admin or Warden role

/**
 * GET /api/admin/dashboard
 * Get dashboard statistics (room stats, allocations by year, etc.)
 */
router.get(
  '/dashboard',
  verifyJWT,
  checkRole(['Admin', 'Warden']),
  adminController.getDashboardStats
);

/**
 * GET /api/admin/allocations
 * Get all allocations with filters
 */
router.get(
  '/allocations',
  verifyJWT,
  checkRole(['Admin', 'Warden']),
  adminController.getAllAllocations
);

/**
 * GET /api/admin/students
 * Get all students with allocation status
 */
router.get(
  '/students',
  verifyJWT,
  checkRole(['Admin', 'Warden']),
  adminController.getAllStudents
);

/**
 * PUT /api/admin/assign-hostel
 * Assign hostel ID to student (Admin only)
 */
router.put(
  '/assign-hostel',
  verifyJWT,
  checkRole(['Admin']),
  adminController.assignHostel
);

/**
 * GET /api/admin/unauthorized-logs
 * Get unauthorized access attempt logs
 */
router.get(
  '/unauthorized-logs',
  verifyJWT,
  checkRole(['Admin']),
  adminController.getUnauthorizedLogs
);

/**
 * GET /api/admin/allocation-logs
 * Get allocation performance logs
 */
router.get(
  '/allocation-logs',
  verifyJWT,
  checkRole(['Admin', 'Warden']),
  adminController.getAllocationLogs
);

module.exports = router;
