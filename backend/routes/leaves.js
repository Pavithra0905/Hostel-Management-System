const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const { verifyJWT } = require('../middleware/auth');
const { checkRole, requireStudent } = require('../middleware/roleCheck');

router.post('/apply', verifyJWT, requireStudent, leaveController.applyLeave);
router.get('/mine', verifyJWT, requireStudent, leaveController.getMyLeaves);
router.get('/all', verifyJWT, checkRole(['Admin', 'Warden']), leaveController.getAllLeaves);
router.put('/:leaveID/status', verifyJWT, checkRole(['Admin', 'Warden']), leaveController.updateLeaveStatus);

module.exports = router;
