const express = require('express');
const router = express.Router();

const accessController = require('../controllers/accessPermissionController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(authenticate);

// Patient can grant/revoke access (single role)
router.post('/patients/grant', authorize('patient'), accessController.grantAccess);
router.delete('/patients/revoke/:access_permission_id', authorize('patient'), accessController.revokeAccess);
router.get('/patients/granted-accesses', authorize('patient'), accessController.getGrantedAccesses)
// Doctor can check access (single role)
router.get('/patients/check-access/:patient_id', authorize('doctor'), accessController.checkDoctorAccess)

// Multi-role example: Both doctors and admins can view access logs
//router.get('/access-logs', authorize(['doctor', 'admin']), accessController.getAccessLogs);

module.exports = router;