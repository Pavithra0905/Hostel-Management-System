/**
 * PAYMENT ROUTES
 * Routes for payment tracking, fee management, and receipt generation
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { verifyJWT } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

/**
 * GET /api/payments/status-me
 * Get current month payment status for logged-in student
 * Access: Student only (validated in controller)
 */
router.get('/status-me', verifyJWT, paymentController.getMyPaymentStatus);

/**
 * GET /api/payments/history-me
 * Get payment history for logged-in student
 */
router.get('/history-me', verifyJWT, paymentController.getMyPaymentHistory);

/**
 * GET /api/payments/status/:studentID
 * Get current month payment status for a student
 * Access: Student (own payment only), Admin, Warden
 */
router.get('/status/:studentID', verifyJWT, paymentController.getPaymentStatus);

/**
 * GET /api/payments/history/:studentID
 * Get payment history for a student
 * Access: Student (own history only), Admin, Warden
 * Query params: limit, offset
 */
router.get('/history/:studentID', verifyJWT, paymentController.getPaymentHistory);

/**
 * GET /api/payments/all
 * Get all students' payment status with filters
 * Access: Admin, Warden only
 * Query params: status, month, limit, offset
 */
router.get('/all', verifyJWT, checkRole(['Admin', 'Warden']), paymentController.getAllStudentsPaymentStatus);

/**
 * POST /api/payments/record
 * Record a payment for a student
 * Access: Admin, Warden only
 * Body: { paymentID, amountPaid, paymentMethod, remarks }
 */
router.post('/record', verifyJWT, checkRole(['Admin', 'Warden']), paymentController.recordPayment);

/**
 * POST /api/payments/reminders/:studentID
 * Send fee reminder via WhatsApp for current month
 */
router.post('/reminders/:studentID', verifyJWT, checkRole(['Admin', 'Warden']), paymentController.sendFeeReminder);

/**
 * GET /api/payments/fine/:paymentID
 * Calculate fine for overdue payment
 * Access: Admin, Warden
 */
router.get('/fine/:paymentID', verifyJWT, checkRole(['Admin', 'Warden']), paymentController.calculateFine);

/**
 * GET /api/payments/receipt/:paymentID
 * Generate receipt for a payment
 * Access: Admin, Warden, Student (own receipt only)
 */
router.get('/receipt/:paymentID', verifyJWT, paymentController.generateReceipt);

/**
 * GET /api/payments/summary
 * Get payment summary for admin dashboard
 * Access: Admin, Warden only
 */
router.get('/summary', verifyJWT, checkRole(['Admin', 'Warden']), paymentController.getPaymentSummary);

module.exports = router;
