const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(authenticate);

// Admin-only routes (using single role string)
router.post('/validate-professional', authorize('admin'), adminController.validateProfessional);
router.get('/pending-validations', authorize('admin'), adminController.getPendingValidations);
router.put('/manage-user', authorize('admin'), adminController.manageUserAccount);
router.get('/all-users', authorize('admin'), adminController.getAllUsers);
router.get('/statistics', authorize('admin'), adminController.getSystemStatistics);
router.get('/access-requests', authorize('admin'), adminController.validateAccessRequests);

module.exports = router;