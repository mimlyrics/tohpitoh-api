const express = require('express');
const router = express.Router();
const laboratoryController = require('../controllers/laboratoryController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

const labTestController = require('../controllers/labtestsController');
// All routes require authentication
router.use(authenticate);

// Laboratory self-management routes
router.get('/profile/me', authorize('laboratory'), laboratoryController.getMyLaboratoryProfile);
router.put('/profile/me', authorize(['laboratory', 'user']), laboratoryController.updateMyLaboratoryProfile); // Allow 'user' to become laboratory

// Admin laboratory management routes
router.get('/profile/:userId', authorize('admin'), laboratoryController.getLaboratoryProfileByAdmin);

router.put('/approve/:laboratoryId', authorize('admin'), laboratoryController.approveLaboratoryProfile);

// Laboratory test management routes
router.get('/tests', authorize('laboratory'), laboratoryController.getLaboratoryTests);
router.get('/tests/:testId', authorize('laboratory'), laboratoryController.getTestDetails);
router.put('/tests/:testId/results', authorize('laboratory'), laboratoryController.updateTestResults);

// Get all laboratories (for admin and maybe patients/doctors)
router.get('/', authorize(['admin', 'patient', 'doctor']), laboratoryController.getAllLaboratories);


router.get('/prescribed-exams', authorize('laboratory'), laboratoryController.getPrescribedExams);
router.put('/update-exam-status', authorize('laboratory'), laboratoryController.updateExamStatus);
router.put('/deposit-results', authorize('laboratory'), laboratoryController.depositResults);

module.exports = router;