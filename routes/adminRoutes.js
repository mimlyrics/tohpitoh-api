const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const adminDoctorController = require('../controllers/admin/doctorController');
const adminPatientController = require('../controllers/admin/patientController');
const adminLaboratoryController = require('../controllers/admin/laboratoryController');
const adminUserController = require('../controllers/admin/userController');
// All routes require authentication
router.use(authenticate);

// Admin-only routes (using single role string)
router.post('/validate-professional', authorize('admin'), adminController.validateProfessional);
router.get('/pending-validations', authorize('admin'), adminController.getPendingValidations);
router.put('/manage-user', authorize('admin'), adminController.manageUserAccount);
router.get('/all-users', authorize('admin'), adminController.getAllUsers);
router.get('/statistics', authorize('admin'), adminController.getSystemStatistics);
router.get('/access-requests', authorize('admin'), adminController.validateAccessRequests);

// ==================== USER MANAGEMENT ====================
router.get('/users', authorize('admin'), adminUserController.getAllUsers);
router.get('/users/:id', authorize('admin'), adminUserController.getUserById);
router.put('/users/:id', authorize('admin'), adminUserController.updateUser);
router.delete('/users/:id', authorize('admin'), adminUserController.deleteUser);

// ==================== DOCTOR MANAGEMENT ====================
router.get('/doctors', authorize('admin'), adminDoctorController.getAllDoctors);
router.get('/doctors/:id', authorize('admin'), adminDoctorController.getDoctorById);
router.put('/doctors/:id/approve', authorize('admin'), adminDoctorController.approveDoctor);
router.put('/doctors/:id/reject', authorize('admin'), adminDoctorController.rejectDoctor);
router.delete('/doctors/:id', authorize('admin'), adminDoctorController.deleteDoctor);

// ==================== PATIENT MANAGEMENT ====================
router.get('/patients', authorize('admin'), adminPatientController.getAllPatients);
router.get('/patients/:id', authorize('admin'), adminPatientController.getPatientById);
router.put('/patients/:id', authorize('admin'), adminPatientController.updatePatient);
router.delete('/patients/:id', authorize('admin'), adminPatientController.deletePatient);

// ==================== LABORATORY MANAGEMENT ====================
router.get('/laboratories', authorize('admin'), adminLaboratoryController.getAllLaboratories);
router.get('/laboratories/:id', authorize('admin'), adminLaboratoryController.getLaboratoryById);
router.put('/laboratories/:id/approve', authorize('admin'), adminLaboratoryController.approveLaboratory);
router.put('/laboratories/:id/reject', authorize('admin'), adminLaboratoryController.rejectLaboratory);
router.delete('/laboratories/:id', authorize('admin'), adminLaboratoryController.deleteLaboratory);


module.exports = router;