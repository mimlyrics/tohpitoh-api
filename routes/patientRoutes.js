const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const adminPatientController = require('../controllers/admin/patientController');
const prescriptionController = require('../controllers/prescriptionController');
const labTestController = require('../controllers/labtestsController');
// All routes require authentication
router.use(authenticate);

// Patient profile routes
router.get('/profile', authorize(['patient', 'admin']), patientController.getPatientProfile);
router.get('/profile/:userId', authorize(['admin']), patientController.getPatientProfile); // Admin can view any profile
router.put('/profile/me', authorize(['patient', 'user']), patientController.updateMyPatientProfile); // Self-update

router.get('/medical-records', authorize(['patient', 'admin']), patientController.getMedicalRecord);
router.put('/emergency-access', authorize('patient'), patientController.configureEmergencyAccess);


// Patient prescription access
router.get('/prescriptions', authorize('patient'), prescriptionController.getMyActivePrescriptions);
router.get('/prescriptions/all', authorize('patient'), prescriptionController.getPatientPrescriptions);
router.get('/prescriptions/stats', authorize('patient'), prescriptionController.getPrescriptionStats);
router.get('/prescriptions/:prescriptionId', authorize('patient'), prescriptionController.getPrescription);
router.put('/prescriptions/:prescriptionId/complete', authorize('patient'), prescriptionController.markPrescriptionCompleted);


// Add to patientRoutes.js
router.get('/lab-tests', authorize('patient'), labTestController.getPatientLabTests);
router.get('/lab-tests/:testId', authorize('patient'), labTestController.getTest);

module.exports = router;
