/**
 * SAFETY ROUTES
 * Endpoints for safety tracking, emergency alerts, and safety analytics.
 */

const express = require('express');
const router = express.Router();

const safetyController = require('../controllers/safetyController');
const { verifyJWT } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// ========================================
// TASK 1: REAL-TIME LOCATION MONITORING
// ========================================

router.post('/location/update', verifyJWT, safetyController.updateLocation);

router.get(
  '/location/all',
  verifyJWT,
  checkRole(['Admin', 'Warden']),
  safetyController.getAllLatestLocations
);

// ========================================
// TASK 2: EMERGENCY & SAFETY ALERTS
// ========================================

router.post('/emergency', verifyJWT, safetyController.createEmergencyAlert);

router.get(
  '/emergency',
  verifyJWT,
  checkRole(['Admin', 'Warden']),
  safetyController.getEmergencyAlerts
);

router.put(
  '/emergency/:id/resolve',
  verifyJWT,
  checkRole(['Admin', 'Warden']),
  safetyController.resolveEmergencyAlert
);

router.post(
  '/incidents',
  verifyJWT,
  checkRole(['Admin', 'Warden']),
  safetyController.createIncidentReport
);

router.get(
  '/incidents/recent',
  verifyJWT,
  checkRole(['Admin', 'Warden']),
  safetyController.getRecentIncidents
);

// ========================================
// TASK 3: REPORTING & ANALYTICS
// ========================================

router.get(
  '/reports/metrics',
  verifyJWT,
  checkRole(['Admin', 'Warden']),
  safetyController.getSafetyMetrics
);

router.get(
  '/reports/high-risk-areas',
  verifyJWT,
  checkRole(['Admin', 'Warden']),
  safetyController.getHighRiskAreas
);

router.get(
  '/reports/trends',
  verifyJWT,
  checkRole(['Admin', 'Warden']),
  safetyController.getIncidentTrends
);

router.get(
  '/reports/export',
  verifyJWT,
  checkRole(['Admin', 'Warden']),
  safetyController.exportSafetyReportsCsv
);

module.exports = router;
