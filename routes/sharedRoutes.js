const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');
const { emergencyAccess } = require('../middleware/auth');

// Emergency access route (no regular authentication required)
router.post('/emergency-view', 
    emergencyAccess, 
    emergencyController.viewEmergencyRecords
);

module.exports= router;