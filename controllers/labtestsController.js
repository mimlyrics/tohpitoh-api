const asyncHandler = require('express-async-handler');
const {  models: {LabTest, Patient, Doctor, User, Laboratory} } = require('../models');
const { Op } = require('sequelize');

// Create lab test order (doctor only)
exports.createLabTest = asyncHandler(async (req, res) => {
  console.log("\nCreating lab test");
  
  const { patient_id, laboratory_id, test_name, instructions } = req.body;
  
  const doctor = await Doctor.findOne({ where: { user_id: req.user.id } });
  
  if (!doctor || !doctor.is_approved) {
    return res.status(403).json({
      success: false,
      message: 'Doctor not found or not approved'
    });
  }
  
  const patient = await Patient.findOne({ where: { id: patient_id } });
  if (!patient) {
    return res.status(404).json({ success: false, message: 'Patient not found' });
  }
  
  const laboratory = await Laboratory.findOne({ where: { id: laboratory_id } });
  if (!laboratory || !laboratory.is_approved) {
    return res.status(404).json({ success: false, message: 'Laboratory not found or not approved' });
  }
  
  const labTest = await LabTest.create({
    patient_id,
    doctor_id: doctor.id,
    laboratory_id,
    test_name,
    status: 'pending',
    ordered_date: new Date()
  });
  
  const createdTest = await LabTest.findOne({
    where: { id: labTest.id },
    include: [
      { model: Patient, as: 'patient' },
      { model: Doctor, as: 'doctor' },
      { model: Laboratory, as: 'laboratory' }
    ]
  });
  
  res.status(201).json({
    success: true,
    message: 'Lab test ordered successfully',
    data: createdTest
  });
});

// Get doctor's ordered lab tests
exports.getDoctorLabTests = asyncHandler(async (req, res) => {
  console.log("\nGetting doctor's lab tests");
  
  const doctor = await Doctor.findOne({ where: { user_id: req.user.id } });
  
  if (!doctor || !doctor.is_approved) {
    return res.status(403).json({
      success: false,
      message: 'Doctor not found or not approved'
    });
  }
  
  const { status, patient_id, limit = 50, page = 1 } = req.query;
  const offset = (page - 1) * limit;
  
  const whereClause = { doctor_id: doctor.id };
  if (status) whereClause.status = status;
  if (patient_id) whereClause.patient_id = patient_id;
  
  const { count, rows: tests } = await LabTest.findAndCountAll({
    where: whereClause,
    include: [
      { model: Patient, as: 'patient' },
      { model: Laboratory, as: 'laboratory' }
    ],
    order: [['ordered_date', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
  
  res.status(200).json({
    success: true,
    count,
    totalPages: Math.ceil(count / limit),
    currentPage: parseInt(page),
    data: tests
  });
});

// Get single test
exports.getTest = asyncHandler(async (req, res) => {
  console.log("\nGetting test");
  
  const { testId } = req.params;
  
  const test = await LabTest.findOne({
    where: { id: testId },
    include: [
      { model: Patient, as: 'patient' },
      { model: Doctor, as: 'doctor' },
      { model: Laboratory, as: 'laboratory' }
    ]
  });
  
  if (!test) {
    return res.status(404).json({ success: false, message: 'Test not found' });
  }
  
  let hasPermission = false;
  
  if (req.user.role === 'admin') {
    hasPermission = true;
  } else if (req.user.role === 'doctor') {
    const doctor = await Doctor.findOne({ where: { user_id: req.user.id } });
    if (doctor && doctor.id === test.doctor_id) hasPermission = true;
  } else if (req.user.role === 'laboratory') {
    const laboratory = await Laboratory.findOne({ where: { user_id: req.user.id } });
    if (laboratory && laboratory.id === test.laboratory_id) hasPermission = true;
  } else if (req.user.role === 'patient') {
    const patient = await Patient.findOne({ where: { user_id: req.user.id } });
    if (patient && patient.id === test.patient_id) hasPermission = true;
  }
  
  if (!hasPermission) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  
  res.status(200).json({ success: true, data: test });
});

// Doctor interpretation of lab results
exports.interpretLabResults = asyncHandler(async (req, res) => {
  console.log("\nInterpreting lab results");
  
  const { testId } = req.params;
  const { doctor_interpretation } = req.body;
  
  const doctor = await Doctor.findOne({ where: { user_id: req.user.id } });
  
  if (!doctor || !doctor.is_approved) {
    return res.status(403).json({
      success: false,
      message: 'Doctor not found or not approved'
    });
  }
  
  const test = await LabTest.findOne({
    where: { id: testId, doctor_id: doctor.id }
  });
  
  if (!test) {
    return res.status(404).json({ success: false, message: 'Test not found' });
  }
  
  if (test.status !== 'completed') {
    return res.status(400).json({ success: false, message: 'Test not completed yet' });
  }
  
  await test.update({ doctor_interpretation });
  
  const updatedTest = await LabTest.findByPk(testId, {
    include: [
      { model: Patient, as: 'patient' },
      { model: Laboratory, as: 'laboratory' }
    ]
  });
  
  res.status(200).json({
    success: true,
    message: 'Interpretation added',
    data: updatedTest
  });
});

// Cancel lab test (doctor only)
exports.cancelLabTest = asyncHandler(async (req, res) => {
  console.log("\nCanceling lab test");
  
  const { testId } = req.params;
  
  const doctor = await Doctor.findOne({ where: { user_id: req.user.id } });
  
  if (!doctor || !doctor.is_approved) {
    return res.status(403).json({
      success: false,
      message: 'Doctor not found or not approved'
    });
  }
  
  const test = await LabTest.findOne({
    where: { id: testId, doctor_id: doctor.id }
  });
  
  if (!test) {
    return res.status(404).json({ success: false, message: 'Test not found' });
  }
  
  if (test.status === 'cancelled') {
    return res.status(400).json({ success: false, message: 'Test already cancelled' });
  }
  
  if (test.status === 'completed') {
    return res.status(400).json({ success: false, message: 'Cannot cancel completed test' });
  }
  
  await test.update({ status: 'cancelled' });
  
  res.status(200).json({
    success: true,
    message: 'Test cancelled successfully'
  });
});

// Get patient's lab tests
exports.getPatientLabTests = asyncHandler(async (req, res) => {
  console.log("\nGetting patient's lab tests");
  
  const patient = await Patient.findOne({ where: { user_id: req.user.id } });
  
  if (!patient) {
    return res.status(404).json({ success: false, message: 'Patient not found' });
  }
  
  const { status, limit = 50, page = 1 } = req.query;
  const offset = (page - 1) * limit;
  
  const whereClause = { patient_id: patient.id };
  if (status) whereClause.status = status;
  
  const { count, rows: tests } = await LabTest.findAndCountAll({
    where: whereClause,
    include: [
      { model: Doctor, as: 'doctor' },
      { model: Laboratory, as: 'laboratory' }
    ],
    order: [['ordered_date', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
  
  res.status(200).json({
    success: true,
    count,
    totalPages: Math.ceil(count / limit),
    currentPage: parseInt(page),
    data: tests
  });
});

// Get laboratory tests (for laboratories) - RENAMED to avoid conflict
exports.getLaboratoryLabTests = asyncHandler(async (req, res) => {
  console.log("\nGetting laboratory tests");
  
  const userId = req.user.id;
  
  const laboratory = await Laboratory.findOne({ where: { user_id: userId } });
  
  if (!laboratory || !laboratory.is_approved) {
    return res.status(403).json({
      success: false,
      message: 'Laboratory not found or not approved'
    });
  }
  
  const { status, fromDate, toDate, limit = 50, page = 1 } = req.query;
  const offset = (page - 1) * limit;
  
  const whereClause = { laboratory_id: laboratory.id };
  if (status) whereClause.status = status;
  
  if (fromDate || toDate) {
    whereClause.ordered_date = {};
    if (fromDate) whereClause.ordered_date[Op.gte] = new Date(fromDate);
    if (toDate) whereClause.ordered_date[Op.lte] = new Date(toDate);
  }
  
  const { count, rows: tests } = await LabTest.findAndCountAll({
    where: whereClause,
    include: [
      { model: Patient, as: 'patient' },
      { model: Doctor, as: 'doctor' }
    ],
    order: [['ordered_date', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
  
  res.status(200).json({
    success: true,
    count,
    totalPages: Math.ceil(count / limit),
    currentPage: parseInt(page),
    data: tests
  });
});

// Get test details (for laboratories) - RENAMED
exports.getLaboratoryTestDetails = asyncHandler(async (req, res) => {
  console.log("\nGetting laboratory test details");
  
  const { testId } = req.params;
  const userId = req.user.id;
  
  const laboratory = await Laboratory.findOne({ where: { user_id: userId } });
  
  if (!laboratory || !laboratory.is_approved) {
    return res.status(403).json({ success: false, message: 'Laboratory not found or not approved' });
  }
  
  const test = await LabTest.findOne({
    where: { id: testId, laboratory_id: laboratory.id },
    include: [
      { model: Patient, as: 'patient' },
      { model: Doctor, as: 'doctor' }
    ]
  });
  
  if (!test) {
    return res.status(404).json({ success: false, message: 'Test not found' });
  }
  
  res.status(200).json({ success: true, data: test });
});

// Update test results (laboratory only)
exports.updateTestResults = asyncHandler(async (req, res) => {
  console.log("\nUpdating test results");
  
  const { testId } = req.params;
  const { results, result_file_url, status } = req.body;
  const userId = req.user.id;
  
  const laboratory = await Laboratory.findOne({ where: { user_id: userId } });
  
  if (!laboratory || !laboratory.is_approved) {
    return res.status(403).json({ success: false, message: 'Laboratory not found or not approved' });
  }
  
  const test = await LabTest.findOne({
    where: { id: testId, laboratory_id: laboratory.id }
  });
  
  if (!test) {
    return res.status(404).json({ success: false, message: 'Test not found' });
  }
  
  const updateData = {};
  if (results !== undefined) updateData.results = results;
  if (result_file_url !== undefined) updateData.result_file_url = result_file_url;
  if (status !== undefined) updateData.status = status;
  
  if (status === 'completed' && test.status !== 'completed') {
    updateData.completed_date = new Date();
  }
  
  await test.update(updateData);
  
  const updatedTest = await LabTest.findByPk(testId, {
    include: [
      { model: Patient, as: 'patient' },
      { model: Doctor, as: 'doctor' }
    ]
  });
  
  res.status(200).json({
    success: true,
    message: 'Test results updated',
    data: updatedTest
  });
});

// Get prescribed exams
exports.getPrescribedExams = asyncHandler(async (req, res) => {
  console.log("\nGetting prescribed exams");
  
  const laboratory = await Laboratory.findOne({ where: { user_id: req.user.id } });
  
  if (!laboratory) {
    return res.status(404).json({ success: false, message: 'Laboratory not found' });
  }
  
  const labTests = await LabTest.findAll({
    where: { 
      laboratory_id: laboratory.id,
      status: ['pending', 'in_progress']
    },
    include: [{ model: Patient, as: 'patient' }],
    order: [['ordered_date', 'ASC']]
  });
  
  res.status(200).json({
    success: true,
    count: labTests.length,
    data: labTests
  });
});

// Get all lab tests for laboratory
exports.getAllLabTests = asyncHandler(async (req, res) => {
  console.log("\nGetting all lab tests");
  
  const laboratory = await Laboratory.findOne({ where: { user_id: req.user.id } });
  
  if (!laboratory) {
    return res.status(404).json({ success: false, message: 'Laboratory not found' });
  }
  
  const labTests = await LabTest.findAll({
    where: { laboratory_id: laboratory.id },
    include: [{ model: Patient, as: 'patient' }],
    order: [['ordered_date', 'DESC']]
  });
  
  res.status(200).json({
    success: true,
    count: labTests.length,
    data: labTests
  });
});