const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { verifyJWT, optionalAuth } = require('../middleware/auth');
const { checkRole, requireStudent } = require('../middleware/roleCheck');
const db = require('../config/db');

// DEBUG: return authenticated user and linked student record
router.get('/debug', verifyJWT, async (req, res) => {
	try {
		const userInfo = req.user || null;
		const [students] = await db.query('SELECT * FROM students WHERE userID = ?', [req.user?.userID]);
		return res.json({ success: true, user: userInfo, student: students[0] || null });
	} catch (error) {
		console.error('Complaints debug error:', error);
		return res.status(500).json({ success: false, message: 'Debug failed', error: error.message });
	}
});

// POST /api/complaints -> Student raises complaint
router.post('/', verifyJWT, requireStudent, complaintController.raiseComplaint);

// GET /api/complaints/student -> Student views own complaints
router.get('/student', verifyJWT, requireStudent, complaintController.getStudentComplaints);

// GET /api/complaints/all -> Warden/Admin view all complaints
// Optional query: category (for category-specific dashboards)
router.get('/all', verifyJWT, checkRole(['Admin', 'Warden']), complaintController.getAllComplaints);

// PUT /api/complaints/:id/assign -> Warden assigns maintenance
router.put('/:id/assign', verifyJWT, checkRole(['Admin', 'Warden']), complaintController.assignMaintenance);

// PUT /api/complaints/:id/resolve -> Mark complaint resolved
router.put('/:id/resolve', verifyJWT, checkRole(['Admin', 'Warden']), complaintController.resolveComplaint);

module.exports = router;
