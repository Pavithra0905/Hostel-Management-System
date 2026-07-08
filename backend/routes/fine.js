const express = require('express');
const router = express.Router();
const fineController = require('../controllers/fineController');
const { verifyJWT } = require('../middleware/auth');
const { checkRole, requireStudent } = require('../middleware/roleCheck');

router.post('/report-out', verifyJWT, requireStudent, fineController.reportOutTime);
router.post('/report-in', verifyJWT, requireStudent, fineController.reportInTime);
router.get('/movements/mine', verifyJWT, requireStudent, fineController.getMyMovements);
router.get('/movements/all', verifyJWT, checkRole(['Admin', 'Warden']), fineController.getAllMovements);
router.post('/process-no-report', verifyJWT, checkRole(['Admin', 'Warden']), fineController.processNoReportFines);

router.post('/', verifyJWT, checkRole(['Admin', 'Warden']), fineController.createFine);
router.get('/all', verifyJWT, checkRole(['Admin', 'Warden']), fineController.getAllFines);
router.get('/mine', verifyJWT, fineController.getMyFines);
router.get('/student/:studentID', verifyJWT, checkRole(['Admin', 'Warden']), fineController.getStudentFines);
router.put('/:fineID/paid', verifyJWT, checkRole(['Admin', 'Warden']), fineController.markFinePaid);

module.exports = router;
