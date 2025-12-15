const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const adminDoctorController = require('../controllers/admin/doctorController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const medicalRecordController = require('../controllers/medicalRecordController');
const prescriptionController = require('../controllers/prescriptionController');
const labTestController = require('../controllers/labtestsController');

// In your backend routes
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });


// All routes require authentication
router.use(authenticate);

// Doctor self-management routes
router.get('/profile/me', authorize('doctor'), doctorController.getMyDoctorProfile);
router.put('/profile/me', authorize(['doctor', 'user']), doctorController.updateMyDoctorProfile); // Allow 'user' to become doctor


// Medical Records (doctor perspective)
router.get('/medical-records/search', authorize('doctor'), medicalRecordController.searchMedicalRecords);
router.get('/medical-records/stats', authorize('doctor'), medicalRecordController.getMedicalRecordStats);
router.get('/medical-records/:recordId', authorize('doctor'), medicalRecordController.getMedicalRecord);
router.put('/medical-records/:recordId', authorize('doctor'), medicalRecordController.updateMedicalRecord);
router.delete('/medical-records/:recordId', authorize('doctor'), medicalRecordController.deleteMedicalRecord);

router.post('/patients/:patientId/medical-records', 
  authorize('doctor'), 
  upload.single('attachment'), // Handle file upload if present
  doctorController.addMedicalRecord
);
router.get('/patients/:patientId/medical-records', authorize('doctor'), medicalRecordController.getPatientMedicalRecords);
router.get('/record-types', authorize(['doctor', 'admin']), medicalRecordController.getRecordTypes);



// Prescription management (doctor perspective)
router.post('/prescriptions', authorize('doctor'), prescriptionController.createPrescription);
router.get('/prescriptions', authorize('doctor'), prescriptionController.getDoctorPrescriptions);
router.get('/prescriptions/:prescriptionId', authorize('doctor'), prescriptionController.getPrescription);
router.put('/prescriptions/:prescriptionId', authorize('doctor'), prescriptionController.updatePrescription);
router.delete('/prescriptions/:prescriptionId', authorize('doctor'), prescriptionController.deletePrescription);
router.get('/patients/:patientId/prescriptions', authorize('doctor'), prescriptionController.getPatientPrescriptions);

router.get('/prescriptions/stats', authorize('doctor'), prescriptionController.getPrescriptionStats);

// Lab Test Management
router.post('/lab-tests', authorize('doctor'), labTestController.createLabTest);
router.get('/lab-tests', authorize('doctor'), labTestController.getDoctorLabTests);
router.get('/lab-tests/:testId', authorize('doctor'), labTestController.getTest);
router.put('/lab-tests/:testId/interpret', authorize('doctor'), labTestController.interpretLabResults);
router.put('/lab-tests/:testId/cancel', authorize('doctor'), labTestController.cancelLabTest);

// Get all doctors (for admin and maybe patients)
router.get('/', authorize(['admin', 'patient']), doctorController.getAllDoctors);

// Patient Management (doctor-specific)
router.get('/patients', authorize(['doctor', 'admin']), doctorController.getPatients);
router.get('/patients/search', authorize('doctor'), doctorController.searchPatients);
router.get('/patients/:patientId', authorize('doctor'), doctorController.getPatientById);

// Statistics
router.get('/stats/medical-records', authorize('doctor'), doctorController.getMedicalRecordStats);
router.get('/stats/prescriptions', authorize('doctor'), doctorController.getPrescriptionStats);

module.exports = router;