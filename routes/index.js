const express = require('express');
const router = express.Router();

// Import all route files
const patientRoutes = require('./patientRoutes');
const doctorRoutes = require('./doctorRoutes');
const laboratoryRoutes = require('./laboratoryRoutes');
const accessRoutes = require('./accessRoutes');
const adminRoutes = require('./adminRoutes');
const userRoutes = require('./userRoutes');
// Use routes
/*router.use('/users', userRoutes)
router.use('/patients', patientRoutes);
router.use('/doctors', doctorRoutes);
router.use('/laboratories', laboratoryRoutes);
router.use('/access', accessRoutes);
router.use('/admin', adminRoutes);*/
