const asyncHandler = require('express-async-handler');
const {models: {Laboratory, User, LabTest, Patient, Doctor, Prescription, MedicalRecord }} = require('../models');

const { Op } = require('sequelize');

// Update laboratory profile for authenticated user (self-update)
exports.updateMyLaboratoryProfile = asyncHandler(async (req, res) => {
  console.log("\nUpdating laboratory profile for authenticated user");
  console.log("Request user:", req.user);
  console.log("Request body:", req.body);
  
  const { lab_name, license_number, address } = req.body;
  
  const userId = req.user.id;
  
  const user = await User.findByPk(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  
  let existingLaboratory = await Laboratory.findOne({ where: { user_id: userId } });
  
  let isFirstTimeCreation = false;
  let laboratory;
  let newAccessToken = null;
  let roleChanged = false;
  
  if (existingLaboratory) {
    if (existingLaboratory.is_approved) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update approved laboratory profile. Please contact admin for changes.',
        data: existingLaboratory
      });
    }
    
    await existingLaboratory.update({
      lab_name: lab_name || existingLaboratory.lab_name,
      license_number: license_number || existingLaboratory.license_number,
      address: address || existingLaboratory.address
    });
    laboratory = existingLaboratory;
  } else {
    isFirstTimeCreation = true;
    laboratory = await Laboratory.create({
      user_id: userId,
      lab_name,
      license_number,
      address,
      is_approved: false
    });
    
    if (user.role === 'user') {
      await user.update({ role: 'laboratory' });
      roleChanged = true;
      
      const { generateAccessToken, generateToken } = require('../utils/generate-token');
      newAccessToken = generateAccessToken(null, user.id, 'laboratory');
      
      const newRefreshToken = generateToken(null, user.id, 'laboratory');
      const currentTokens = user.refreshToken || [];
      await user.update({ refreshToken: [...currentTokens, newRefreshToken] });
    }
  }

  const updatedLaboratory = await Laboratory.findOne({
    where: { id: laboratory.id },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'role']
      }
    ]
  });

  const response = {
    success: true,
    message: isFirstTimeCreation ? 'Laboratory profile created successfully (pending admin approval)' : 'Laboratory profile updated successfully (pending admin approval)',
    data: updatedLaboratory,
    note: 'Laboratory profile requires admin approval before it can be used'
  };
  
  if (newAccessToken) response.accessToken = newAccessToken;
  if (roleChanged) response.message += ' (role updated to laboratory)';

  res.status(200).json(response);
});

// Approve laboratory profile (admin only)
exports.approveLaboratoryProfile = asyncHandler(async (req, res) => {
  console.log("\nAdmin approving laboratory profile");
  
  const { laboratoryId } = req.params;
  
  const laboratory = await Laboratory.findByPk(laboratoryId, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'first_name', 'last_name', 'email', 'role']
      }
    ]
  });
  
  if (!laboratory) {
    return res.status(404).json({ success: false, message: 'Laboratory profile not found' });
  }
  
  if (laboratory.is_approved) {
    return res.status(400).json({ success: false, message: 'Laboratory profile is already approved', data: laboratory });
  }
  
  await laboratory.update({
    is_approved: true,
    approved_by_admin_id: req.user.id,
    approved_at: new Date()
  });
  
  if (laboratory.user.role !== 'laboratory') {
    await laboratory.user.update({ role: 'laboratory' });
  }
  
  const approvedLaboratory = await Laboratory.findByPk(laboratoryId, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'role']
      }
    ]
  });

  res.status(200).json({
    success: true,
    message: `Laboratory profile approved successfully for ${approvedLaboratory.lab_name}`,
    data: approvedLaboratory,
    adminAction: {
      performedBy: `${req.user.first_name} ${req.user.last_name}`,
      adminId: req.user.id,
      approvedAt: approvedLaboratory.approved_at
    }
  });
});

// Get authenticated laboratory's own profile
exports.getMyLaboratoryProfile = asyncHandler(async (req, res) => {
  console.log("\nGetting authenticated laboratory's profile");
  
  const userId = req.user.id;
  
  const laboratory = await Laboratory.findOne({
    where: { user_id: userId },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'role']
      }
    ]
  });
  
  if (!laboratory) {
    return res.status(404).json({
      success: false,
      message: 'Laboratory profile not found. Please create a profile first.',
      hasProfile: false
    });
  }
  
  res.status(200).json({ success: true, data: laboratory, hasProfile: true });
});

// Admin get any laboratory's profile
exports.getLaboratoryProfileByAdmin = asyncHandler(async (req, res) => {
  console.log("\nAdmin getting laboratory profile");
  
  const { userId } = req.params;
  
  const laboratory = await Laboratory.findOne({
    where: { user_id: userId },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'role']
      },
      {
        model: User,
        as: 'approvedByAdmin',
        attributes: ['id', 'first_name', 'last_name', 'email']
      }
    ]
  });
  
  if (!laboratory) {
    return res.status(404).json({ success: false, message: 'Laboratory profile not found for this user' });
  }
  
  res.status(200).json({ success: true, data: laboratory });
});

// In laboratoryController.js
exports.getAllLaboratories = asyncHandler(async (req, res) => {
  console.log("\nGetting all laboratories");
  
  const { approvedOnly = true, search } = req.query;
  
  const whereClause = {};
  
  if (approvedOnly === 'true' || approvedOnly === true) {
    whereClause.is_approved = true;
  }
  
  if (search) {
    whereClause[Op.or] = [
      { lab_name: { [Op.iLike]: `%${search}%` } },
      { address: { [Op.iLike]: `%${search}%` } }
    ];
  }
  
  const laboratories = await Laboratory.findAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
      },
      {
        model: User,
        as: 'approvedByAdmin',
        attributes: ['id', 'first_name', 'last_name']
      }
    ],
    order: [['createdAt', 'DESC']]  // Changed from created_at to createdAt
  });
  
  res.status(200).json({ success: true, count: laboratories.length, data: laboratories });
});

// Get laboratory tests - FIXED
exports.getLaboratoryTests = asyncHandler(async (req, res) => {
  console.log("\nGetting laboratory tests");
  
  const userId = req.user.id;
  
  const laboratory = await Laboratory.findOne({ where: { user_id: userId } });
  
  if (!laboratory || !laboratory.is_approved) {
    return res.status(403).json({
      success: false,
      message: 'Laboratory not found or not approved'
    });
  }
  
  const { status, fromDate, toDate } = req.query;
  
  const whereClause = { laboratory_id: laboratory.id };
  if (status) whereClause.status = status;
  
  if (fromDate || toDate) {
    whereClause.ordered_date = {};
    if (fromDate) whereClause.ordered_date[Op.gte] = new Date(fromDate);
    if (toDate) whereClause.ordered_date[Op.lte] = new Date(toDate);
  }
  
  const tests = await LabTest.findAll({
    where: whereClause,
    include: [
      { model: Patient, as: 'patient' },
      { model: Doctor, as: 'doctor' }
    ],
    order: [['ordered_date', 'DESC']]
  });
  
  res.status(200).json({ success: true, count: tests.length, data: tests });
});

// Get test details - FIXED
exports.getTestDetails = asyncHandler(async (req, res) => {
  console.log("\nGetting test details");
  
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

// Update test results - FIXED
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

// Get prescribed exams - FIXED
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
  
  res.status(200).json({ success: true, count: labTests.length, data: labTests });
});

// Update exam status - FIXED
exports.updateExamStatus = asyncHandler(async (req, res) => {
  console.log("\nUpdating exam status");
  
  const { lab_test_id, status } = req.body;

  const laboratory = await Laboratory.findOne({ where: { user_id: req.user.id } });
  
  if (!laboratory) {
    return res.status(404).json({ success: false, message: 'Laboratory not found' });
  }

  const labTest = await LabTest.findOne({
    where: { id: lab_test_id, laboratory_id: laboratory.id }
  });

  if (!labTest) {
    return res.status(404).json({ success: false, message: 'Lab test not found' });
  }

  await labTest.update({
    status: status || labTest.status,
    completed_date: status === 'completed' ? new Date() : labTest.completed_date
  });

  res.status(200).json({ success: true, message: 'Exam status updated', data: labTest });
});

// Deposit analysis results - FIXED
exports.depositResults = asyncHandler(async (req, res) => {
  console.log("\nDepositing analysis results");
  
  const { lab_test_id, results, result_file_url } = req.body;

  const laboratory = await Laboratory.findOne({ where: { user_id: req.user.id } });
  
  if (!laboratory) {
    return res.status(404).json({ success: false, message: 'Laboratory not found' });
  }

  const labTest = await LabTest.findOne({
    where: { id: lab_test_id, laboratory_id: laboratory.id }
  });

  if (!labTest) {
    return res.status(404).json({ success: false, message: 'Lab test not found' });
  }

  await labTest.update({
    results: results || labTest.results,
    result_file_url: result_file_url || labTest.result_file_url,
    status: 'completed',
    completed_date: new Date()
  });

  res.status(200).json({ success: true, message: 'Analysis results deposited', data: labTest });
});

// Get all lab tests for laboratory - FIXED
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

  res.status(200).json({ success: true, count: labTests.length, data: labTests });
});

// Keep legacy functions for backward compatibility
exports.getLaboratoryProfile = exports.getMyLaboratoryProfile;
exports.updateLaboratoryProfile = exports.updateMyLaboratoryProfile;