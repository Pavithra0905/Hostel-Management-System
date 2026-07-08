/**
 * ROOM ROUTES
 * Routes for room management (CRUD operations)
 * Access controlled by RBAC middleware
 */

const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { verifyJWT } = require('../middleware/auth');
const { checkRole, checkPermission } = require('../middleware/roleCheck');

// ========================================
// PUBLIC/STUDENT ROUTES
// ========================================

/**
 * GET /api/rooms/:roomID
 * Get room details by ID
 * Accessible by all authenticated users
 */
router.get('/:roomID', verifyJWT, roomController.getRoomById);

// ========================================
// ADMIN/WARDEN ROUTES
// ========================================

/**
 * POST /api/rooms
 * Create a new room
 * Only Admin can create rooms
 */
router.post(
  '/',
  verifyJWT,
  checkPermission('rooms', 'create'),
  roomController.createRoom
);

/**
 * PUT /api/rooms/:roomID
 * Update room details
 * Admin and Warden can update rooms
 */
router.put(
  '/:roomID',
  verifyJWT,
  checkPermission('rooms', 'update'),
  roomController.updateRoom
);

/**
 * DELETE /api/rooms/:roomID
 * Delete a room
 * Only Admin can delete rooms
 */
router.delete(
  '/:roomID',
  verifyJWT,
  checkRole(['Admin']),
  roomController.deleteRoom
);

module.exports = router;
