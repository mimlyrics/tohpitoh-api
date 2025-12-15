const asyncHandler = require('express-async-handler');
const { models: { MedicalRecord, Patient, Doctor, User, Laboratory, Prescription } } = require('../models');
const { Op } = require('sequelize');

exports.addMedicalRecord = asyncHandler(async (req, res) => {
  console.log("\n=== ADD MEDICAL RECORD ===");
  console.log("Params:", req.params);
  console.log("Body:", req.body);
  console.log("User:", req.user);
  
  const { patientId } = req.params;
  const { 
    title, 
    description, 
    record_type, 
    laboratory_id, 
    date, 
    is_shared,
    doctor_id  // Make sure this comes from the request or use req.user.id
  } = req.body;
  

  // Get doctor from user ID
  const doctor = await Doctor.findOne({ where: { user_id: req.user.id } });
  if (!doctor || !doctor.is_approved) {
    return res.status(403).json({
      success: false,
      message: 'Doctor not found or not approved'
    });
  }
  
  // Verify patient exists
  const patient = await Patient.findOne({ where: { id: patientId } });
  if (!patient) {
    return res.status(404).json({ 
      success: false, 
      message: 'Patient not found' 
    });
  }
  
  // Validate required fields
  if (!title || !title.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Title is required'
    });
  }
  
  // Create medical record
  const medicalRecord = await MedicalRecord.create({
    title: title.trim(),
    description: description ? description.trim() : null,
    record_type: record_type || 'consultation',
    patient_id: patientId,
    doctor_id: doctor.id,  // Use doctor.id from the database
    laboratory_id: laboratory_id ? parseInt(laboratory_id) : null,
    date: date || new Date(),
    is_shared: is_shared === 'true' || is_shared === true,
    attachment_url: null  // No file uploads
  });
  
  const createdRecord = await MedicalRecord.findOne({
    where: { id: medicalRecord.id },
    include: [
      { model: Patient, as: 'patient', include: [{ model: User, as: 'user' }] },
      { model: Doctor, as: 'doctor' },
      { model: Laboratory, as: 'laboratory' }
    ]
  });
  
  res.status(201).json({
    success: true,
    message: 'Medical record created successfully',
    data: createdRecord
  });
});
// Get patient medical records
exports.getPatientMedicalRecords = asyncHandler(async (req, res) => {
  console.log("\nGetting patient medical records");
  
  const { patientId } = req.params;
  
  let doctor = null;
  if (req.user.role === 'doctor') {
    doctor = await Doctor.findOne({ where: { user_id: req.user.id } });
    
    if (!doctor || !doctor.is_approved) {
      return res.status(403).json({
        success: false,
        message: 'Doctor not found or not approved'
      });
    }
  }
  
  const { record_type, fromDate, toDate, limit = 50, page = 1 } = req.query;
  const offset = (page - 1) * limit;
  
  const whereClause = { patient_id: patientId };
  if (record_type) whereClause.record_type = record_type;
  
  if (fromDate || toDate) {
    whereClause.date = {};
    if (fromDate) whereClause.date[Op.gte] = new Date(fromDate);
    if (toDate) whereClause.date[Op.lte] = new Date(toDate);
  }
  
  if (req.user.role === 'doctor' && doctor) {
    whereClause[Op.or] = [
      { doctor_id: doctor.id },
      { is_shared: true },
      { [Op.and]: [
        { is_shared: true },
        { shared_until: { [Op.gte]: new Date() } }
      ]}
    ];
  }
  
  const { count, rows: records } = await MedicalRecord.findAndCountAll({
    where: whereClause,
    include: [
      { model: Doctor, as: 'doctor' },
      { model: Laboratory, as: 'laboratory' }
    ],
    order: [['date', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
  
  res.status(200).json({
    success: true,
    count,
    totalPages: Math.ceil(count / limit),
    currentPage: parseInt(page),
    data: records
  });
});

// Get single medical record - SIMPLIFIED
exports.getMedicalRecord = asyncHandler(async (req, res) => {
  console.log("\nGetting medical record");
  
  const { recordId } = req.params;
  
  const record = await MedicalRecord.findOne({
    where: { id: recordId },
    include: [
      { model: Patient, as: 'patient' },
      { model: Doctor, as: 'doctor' }
    ]
  });
  
  if (!record) {
    return res.status(404).json({ success: false, message: 'Medical record not found' });
  }
  
  // Check if user is doctor
  if (req.user.role === 'doctor') {
    // Allow access if doctor created it OR if it's shared
    if (record.doctor_id) {
      const doctor = await Doctor.findOne({ where: { user_id: req.user.id } });
      if (doctor && doctor.id === record.doctor_id) {
        return res.status(200).json({ success: true, data: record });
      }
    }
    
    // Check if shared
    if (record.is_shared) {
      const now = new Date();
      if (!record.shared_until || record.shared_until > now) {
        return res.status(200).json({ success: true, data: record });
      }
    }
    
    return res.status(403).json({ success: false, message: 'Access denied, patient did not allow access' });
  }
  
  if (req.user.role === 'admin') {
    return res.status(200).json({ success: true, data: record });
  }
  
  if (req.user.role === 'patient') {
    const patient = await Patient.findOne({ where: { user_id: req.user.id } });
    if (patient && patient.id === record.patient_id) {
      return res.status(200).json({ success: true, data: record });
    }
  }
  
  return res.status(403).json({ success: false, message: 'Access denied' });
});

// Update medical record with null handling
exports.updateMedicalRecord = asyncHandler(async (req, res) => {
  console.log("\nUpdating medical record");
  
  const { recordId } = req.params;
  const { title, description, laboratory_id, attachment_url, is_shared, shared_until, record_type, date } = req.body;
  
  const record = await MedicalRecord.findByPk(recordId);
  
  if (!record) {
    return res.status(404).json({ success: false, message: 'Medical record not found' });
  }
  
  let hasPermission = false;
  
  if (req.user.role === 'admin') {
    hasPermission = true;
  } else if (req.user.role === 'doctor') {
    const doctor = await Doctor.findOne({ where: { user_id: req.user.id } });
    if (doctor && doctor.id === record.doctor_id) {
      hasPermission = true;
    }
  }
  
  if (!hasPermission) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  
  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (attachment_url !== undefined) updateData.attachment_url = attachment_url;
  if (is_shared !== undefined) updateData.is_shared = is_shared;
  if (shared_until !== undefined) updateData.shared_until = shared_until;
  if (record_type !== undefined) updateData.record_type = record_type;
  if (date !== undefined) updateData.date = date;
  
  // Handle laboratory_id (can be null to remove association)
  if (laboratory_id !== undefined) {
    if (laboratory_id === null || laboratory_id === '') {
      updateData.laboratory_id = null;
    } else {
      const laboratory = await Laboratory.findByPk(laboratory_id);
      if (!laboratory) {
        return res.status(404).json({ 
          success: false, 
          message: 'Laboratory not found' 
        });
      }
      updateData.laboratory_id = laboratory_id;
    }
  }
  
  await record.update(updateData);
  
  const updatedRecord = await MedicalRecord.findByPk(recordId, {
    include: [
      { model: Patient, as: 'patient' },
      { model: Doctor, as: 'doctor' },
      { model: Laboratory, as: 'laboratory' }
    ]
  });
  
  res.status(200).json({
    success: true,
    message: 'Medical record updated',
    data: updatedRecord
  });
});

// Delete medical record
exports.deleteMedicalRecord = asyncHandler(async (req, res) => {
  console.log("\nDeleting medical record");
  
  const { recordId } = req.params;
  
  const record = await MedicalRecord.findByPk(recordId);
  
  if (!record) {
    return res.status(404).json({ success: false, message: 'Medical record not found' });
  }
  
  let hasPermission = false;
  
  if (req.user.role === 'admin') {
    hasPermission = true;
  } else if (req.user.role === 'doctor') {
    const doctor = await Doctor.findOne({ where: { user_id: req.user.id } });
    if (doctor && doctor.id === record.doctor_id) {
      hasPermission = true;
    }
  }
  
  if (!hasPermission) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  
  await record.destroy();
  
  res.status(200).json({ success: true, message: 'Medical record deleted' });
});

// Restore deleted medical record
exports.restoreMedicalRecord = asyncHandler(async (req, res) => {
  console.log("\nRestoring medical record");
  
  const { recordId } = req.params;
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Only admin' });
  }
  
  const record = await MedicalRecord.findOne({
    where: { id: recordId },
    paranoid: false
  });
  
  if (!record) {
    return res.status(404).json({ success: false, message: 'Medical record not found' });
  }
  
  if (!record.deleted_at) {
    return res.status(400).json({ success: false, message: 'Medical record not deleted' });
  }
  
  await record.restore();
  
  res.status(200).json({
    success: true,
    message: 'Medical record restored',
    data: record
  });
});

// Search medical records
exports.searchMedicalRecords = asyncHandler(async (req, res) => {
  console.log("\nSearching medical records");
  
  const { query, patientId, doctorId, record_type, fromDate, toDate } = req.query;
  
  const whereClause = {};
  if (patientId) whereClause.patient_id = patientId;
  if (doctorId) whereClause.doctor_id = doctorId;
  if (record_type) whereClause.record_type = record_type;
  
  if (fromDate || toDate) {
    whereClause.date = {};
    if (fromDate) whereClause.date[Op.gte] = new Date(fromDate);
    if (toDate) whereClause.date[Op.lte] = new Date(toDate);
  }
  
  if (query) {
    whereClause[Op.or] = [
      { title: { [Op.iLike]: `%${query}%` } },
      { description: { [Op.iLike]: `%${query}%` } }
    ];
  }
  
  if (req.user.role === 'doctor') {
    const doctor = await Doctor.findOne({ where: { user_id: req.user.id } });
    if (doctor) {
      if (!whereClause[Op.and]) whereClause[Op.and] = [];
      whereClause[Op.and].push({
        [Op.or]: [
          { doctor_id: doctor.id },
          { is_shared: true },
          { [Op.and]: [
            { is_shared: true },
            { shared_until: { [Op.gte]: new Date() } }
          ]}
        ]
      });
    }
  } else if (req.user.role === 'patient') {
    const patient = await Patient.findOne({ where: { user_id: req.user.id } });
    if (patient) {
      whereClause.patient_id = patient.id;
      if (!whereClause[Op.and]) whereClause[Op.and] = [];
      whereClause[Op.and].push({
        [Op.or]: [
          { is_shared: true },
          { [Op.and]: [
            { is_shared: true },
            { shared_until: { [Op.gte]: new Date() } }
          ]}
        ]
      });
    }
  }
  
  const records = await MedicalRecord.findAll({
    where: whereClause,
    include: [
      { model: Patient, as: 'patient' },
      { model: Doctor, as: 'doctor' }
    ],
    order: [['date', 'DESC']],
    limit: 100
  });
  
  res.status(200).json({
    success: true,
    count: records.length,
    data: records
  });
});
// Get medical record statistics
exports.getMedicalRecordStats = asyncHandler(async (req, res) => {
  console.log("\nGetting medical record statistics");
  
  let whereClause = {};
  
  if (req.user.role === 'doctor') {
    const doctor = await Doctor.findOne({ where: { user_id: req.user.id } });
    if (doctor) {
      whereClause.doctor_id = doctor.id;
    } else {
      return res.status(403).json({ success: false, message: 'Doctor not found' });
    }
  } else if (req.user.role === 'patient') {
    const patient = await Patient.findOne({ where: { user_id: req.user.id } });
    if (patient) {
      whereClause.patient_id = patient.id;
    } else {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
  }
  
  const totalRecords = await MedicalRecord.count({ where: whereClause });
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Use 'createdAt' (default Sequelize) or check your model for actual column name
  const recentRecords = await MedicalRecord.count({
    where: { ...whereClause, createdAt: { [Op.gte]: thirtyDaysAgo } }
    // OR if your model uses 'created_at':
    // where: { ...whereClause, created_at: { [Op.gte]: thirtyDaysAgo } }
  });
  
  res.status(200).json({
    success: true,
    data: { totalRecords, recentRecords }
  });
});

// Get record types
exports.getRecordTypes = asyncHandler(async (req, res) => {
  const recordTypes = [
    { value: 'consultation', label: 'Consultation' },
    { value: 'diagnosis', label: 'Diagnosis' },
    { value: 'prescription', label: 'Prescription' },
    { value: 'vaccination', label: 'Vaccination' },
    { value: 'lab_result', label: 'Lab Result' },
    { value: 'imaging', label: 'Imaging Result' },
    { value: 'surgery', label: 'Surgery Notes' },
    { value: 'therapy', label: 'Therapy Session' },
    { value: 'other', label: 'Other' }
  ];
  
  res.status(200).json({ success: true, data: recordTypes });
});

// Legacy function
exports.addClinicalNotes = exports.addMedicalRecord;