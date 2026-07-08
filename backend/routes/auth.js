/**
 * AUTHENTICATION ROUTES
 * Routes for user registration, login, password management
 * MODULE 1: User Authentication & Access Management
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyJWT } = require('../middleware/auth');

// ========================================
// PUBLIC ROUTES (No authentication required)
// ========================================

/**
 * POST /api/auth/register
 * Register a new user (Student, Warden, or Admin)
 */
router.post('/register', authController.register);

/**
 * POST /api/auth/signup
 * Alias for registration endpoint
 */
router.post('/signup', authController.register);

/**
 * POST /api/auth/login
 * User login - returns JWT token
 */
router.post('/login', authController.login);

/**
 * POST /api/auth/forgot-password
 * Request password reset token
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * POST /api/auth/reset-password
 * Reset password using token
 */
router.post('/reset-password', authController.resetPassword);

// ========================================
// PROTECTED ROUTES (Authentication required)
// ========================================

/**
 * POST /api/auth/logout
 * User logout
 */
router.post('/logout', verifyJWT, authController.logout);

/**
 * GET /api/auth/profile
 * Get current user profile
 */
router.get('/profile', verifyJWT, authController.getProfile);

module.exports = router;
