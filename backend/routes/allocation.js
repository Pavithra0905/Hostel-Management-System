/**
 * ALLOCATION ROUTES
 * Routes for room allocation and booking
 * Implements MODULE 2: Priority-Based Room Allocation
 */

const express = require('express');
const router = express.Router();
const allocationController = require('../controllers/allocationController');
const { verifyJWT } = require('../middleware/auth');
const { checkRole, requireStudent } = require('../middleware/roleCheck');

// ========================================
// STUDENT ROUTES
// ========================================

/**
 * GET /api/allocations/available-rooms
 * Get available rooms based on student's year
 * Only Students can access
 */
router.get(
  '/available-rooms',
  verifyJWT,
  requireStudent,
  allocationController.getAvailableRooms
);

/**
 * POST /api/allocations/allocate
 * Request room allocation
 * Only Students can allocate rooms
 */
router.post(
  '/allocate',
  verifyJWT,
  requireStudent,
  allocationController.allocateRoom
);

/**
 * GET /api/allocations/my-history
 * Get allocation history for logged-in student
 * Only Students can access their own history
 */
router.get(
  '/my-history',
  verifyJWT,
  requireStudent,
  allocationController.getAllocationHistory
);

/**
 * GET /api/allocations/my-allocation
 * Get current active allocation for logged-in student
 * Only Students can access
 */
router.get(
  '/my-allocation',
  verifyJWT,
  requireStudent,
  allocationController.getCurrentAllocation
);

/**
 * DELETE /api/allocations/:allocationID/cancel
 * Cancel room allocation
 * Students can cancel their own allocations
 */
router.delete(
  '/:allocationID/cancel',
  verifyJWT,
  allocationController.cancelAllocation
);

/**
 * POST /api/allocations/book-with-details
 * Submit booking request with detailed information
 * Students provide: roomID, startDate, duration, noOfSeaters, foodRequired, foodCost, monthlyFee
 */
router.post(
  '/book-with-details',
  verifyJWT,
  requireStudent,
  allocationController.submitBookingRequest
);

/**
 * GET /api/allocations/my-bookings
 * Get all booking requests for logged-in student
 * Only Students can access
 */
router.get(
  '/my-bookings',
  verifyJWT,
  requireStudent,
  allocationController.getMyBookingRequests
);

/**
 * GET /api/allocations/my-booking-payments
 * Get booking payment transaction history for logged-in student
 */
router.get(
  '/my-booking-payments',
  verifyJWT,
  requireStudent,
  allocationController.getMyBookingPaymentTransactions
);

/**
 * POST /api/allocations/waiting-list
 * Join waiting list for a room
 */
router.post(
  '/waiting-list',
  verifyJWT,
  requireStudent,
  allocationController.joinRoomWaitingList
);

/**
 * GET /api/allocations/waiting-list/mine
 * Get waiting list entries for logged-in student
 */
router.get(
  '/waiting-list/mine',
  verifyJWT,
  requireStudent,
  allocationController.getMyWaitingList
);

/**
 * DELETE /api/allocations/waiting-list/:waitingID
 * Cancel a student's pending waiting-list entry
 */
router.delete(
  '/waiting-list/:waitingID',
  verifyJWT,
  requireStudent,
  allocationController.cancelMyWaitingEntry
);

// ========================================
// ADMIN/WARDEN ROUTES
// ========================================

/**
 * GET /api/allocations/booking-requests
 * Get booking requests for admin/warden review
 */
router.get(
  '/booking-requests',
  verifyJWT,
  checkRole(['Admin', 'Warden']),
  allocationController.getAllBookingRequests
);

/**
 * POST /api/allocations/booking-requests/:bookingID/approve
 * Approve booking request and allocate room
 */
router.post(
  '/booking-requests/:bookingID/approve',
  verifyJWT,
  checkRole(['Admin', 'Warden']),
  allocationController.approveBookingRequest
);

/**
 * POST /api/allocations/booking-requests/:bookingID/reject
 * Reject booking request
 */
router.post(
  '/booking-requests/:bookingID/reject',
  verifyJWT,
  checkRole(['Admin', 'Warden']),
  allocationController.rejectBookingRequest
);

/**
 * GET /api/allocations/all-rooms
 * Get all rooms (for Admin/Warden dashboard)
 * Only Admin and Warden can access
 */
router.get(
  '/all-rooms',
  verifyJWT,
  checkRole(['Admin', 'Warden']),
  allocationController.getAllRooms
);

/**
 * GET /api/allocations/all-rooms-public
 * Public (authenticated) access for students to view room inventory (read-only)
 */
router.get(
  '/all-rooms-public',
  verifyJWT,
  allocationController.getAllRoomsPublic
);

/**
 * GET /api/allocations/waiting-list
 * View waiting list as Admin/Warden
 */
router.get(
  '/waiting-list',
  verifyJWT,
  checkRole(['Admin', 'Warden']),
  allocationController.getWaitingListAdmin
);

/**
 * GET /api/allocations/reallocation-logs
 * View reallocation logs as Admin/Warden
 */
router.get(
  '/reallocation-logs',
  verifyJWT,
  checkRole(['Admin', 'Warden']),
  allocationController.getReallocationLogs
);

/**
 * POST /api/allocations/reallocation-sweep
 * Trigger manual reallocation sweep as Admin/Warden
 */
router.post(
  '/reallocation-sweep',
  verifyJWT,
  checkRole(['Admin', 'Warden']),
  allocationController.triggerReallocationSweep
);

module.exports = router;
