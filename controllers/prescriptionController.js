const asyncHandler = require('express-async-handler');
const { models: { Prescription, Patient, Doctor, User, MedicalRecord} } = require('../models');
const { Op } = require('sequelize');
// Create prescription (doctor only)
exports.createPrescription = asyncHandler(async (req, res) => {
  console.log("\nCreating prescription");
  
  const { patient_id, medication_name, dosage, frequency, duration, instructions, end_date } = req.body;
  console.log(req.body);
  
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
  
  const prescription = await Prescription.create({
    patient_id,
    doctor_id: doctor.id,
    medication_name,
    dosage,
    frequency,
    duration,
    instructions,
    end_date,
    prescribed_date: new Date()
  });
  
  await MedicalRecord.create({
    patient_id,
    doctor_id: doctor.id,
    record_type: 'prescription',
    title: `Prescription: ${medication_name}`,
    description: `${medication_name} - ${dosage}, ${frequency}, ${duration}. ${instructions ? `Instructions: ${instructions}` : ''}`,
    date: new Date()
  });
  
  const createdPrescription = await Prescription.findOne({
    where: { id: prescription.id },
    include: [
      { model: Patient, as: 'patient' },
      { model: Doctor, as: 'doctor' }
    ]
  });
  
  res.status(201).json({
    success: true,
    message: 'Prescription created successfully',
    data: createdPrescription
  });
});

// Get doctor's prescriptions
exports.getDoctorPrescriptions = asyncHandler(async (req, res) => {
  console.log("\nGetting doctor's prescriptions");
  
  const doctor = await Doctor.findOne({ where: { user_id: req.user.id } });
  
  if (!doctor || !doctor.is_approved) {
    return res.status(403).json({
      success: false,
      message: 'Doctor not found or not approved'
    });
  }
  
  const { patient_id, isActive, limit = 50, page = 1 } = req.query;
  const offset = (page - 1) * limit;
  
  const whereClause = { doctor_id: doctor.id };
  if (patient_id) whereClause.patient_id = patient_id;
  if (isActive !== undefined) whereClause.isActive = isActive === 'true';
  
  const { count, rows: prescriptions } = await Prescription.findAndCountAll({
    where: whereClause,
    include: [{ model: Patient, as: 'patient' }],
    order: [['prescribed_date', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
  
  res.status(200).json({
    success: true,
    count,
    totalPages: Math.ceil(count / limit),
    currentPage: parseInt(page),
    data: prescriptions
  });
});

// Get single prescription
exports.getPrescription = asyncHandler(async (req, res) => {
  console.log("\nGetting prescription");
  
  const { prescriptionId } = req.params;
  
  const prescription = await Prescription.findOne({
    where: { id: prescriptionId },
    include: [
      { model: Patient, as: 'patient' },
      { model: Doctor, as: 'doctor' }
    ]
  });
  
  if (!prescription) {
    return res.status(404).json({ success: false, message: 'Prescription not found' });
  }
  
  let hasPermission = false;
  
  if (req.user.role === 'admin') {
    hasPermission = true;
  } else if (req.user.role === 'doctor') {
    const doctor = await Doctor.findOne({ where: { user_id: req.user.id } });
    if (doctor && doctor.id === prescription.doctor_id) hasPermission = true;
  } else if (req.user.role === 'patient') {
    const patient = await Patient.findOne({ where: { user_id: req.user.id } });
    if (patient && patient.id === prescription.patient_id) hasPermission = true;
  }
  
  if (!hasPermission) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  
  res.status(200).json({ success: true, data: prescription });
});

// Update prescription
exports.updatePrescription = asyncHandler(async (req, res) => {
  console.log("\nUpdating prescription");
  
  const { prescriptionId } = req.params;
  const { medication_name, dosage, frequency, duration, instructions, end_date, isActive } = req.body;
  
  const prescription = await Prescription.findByPk(prescriptionId);
  
  if (!prescription) {
    return res.status(404).json({ success: false, message: 'Prescription not found' });
  }
  
  let hasPermission = false;
  
  if (req.user.role === 'admin') {
    hasPermission = true;
  } else if (req.user.role === 'doctor') {
    const doctor = await Doctor.findOne({ where: { user_id: req.user.id } });
    if (doctor && doctor.id === prescription.doctor_id) hasPermission = true;
  }
  
  if (!hasPermission) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  
  const updateData = {};
  if (medication_name !== undefined) updateData.medication_name = medication_name;
  if (dosage !== undefined) updateData.dosage = dosage;
  if (frequency !== undefined) updateData.frequency = frequency;
  if (duration !== undefined) updateData.duration = duration;
  if (instructions !== undefined) updateData.instructions = instructions;
  if (end_date !== undefined) updateData.end_date = end_date;
  if (isActive !== undefined) updateData.isActive = isActive;
  
  await prescription.update(updateData);
  
  const updatedPrescription = await Prescription.findByPk(prescriptionId, {
    include: [
      { model: Patient, as: 'patient' },
      { model: Doctor, as: 'doctor' }
    ]
  });
  
  res.status(200).json({
    success: true,
    message: 'Prescription updated',
    data: updatedPrescription
  });
});

// Delete prescription (soft delete)
exports.deletePrescription = asyncHandler(async (req, res) => {
  console.log("\nDeleting prescription");
  
  const { prescriptionId } = req.params;
  
  const prescription = await Prescription.findByPk(prescriptionId);
  
  if (!prescription) {
    return res.status(404).json({ success: false, message: 'Prescription not found' });
  }
  
  let hasPermission = false;
  
  if (req.user.role === 'admin') {
    hasPermission = true;
  } else if (req.user.role === 'doctor') {
    const doctor = await Doctor.findOne({ where: { user_id: req.user.id } });
    if (doctor && doctor.id === prescription.doctor_id) hasPermission = true;
  }
  
  if (!hasPermission) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  
  await prescription.destroy();
  
  res.status(200).json({ success: true, message: 'Prescription deleted' });
});

// Get patient's own prescriptions
exports.getPatientPrescriptions = asyncHandler(async (req, res) => {
  console.log("\nGetting patient's prescriptions");
  
  if (req.user.role !== 'patient') {
    return res.status(403).json({ success: false, message: 'Only patients can access' });
  }
  
  // Get patient from authenticated user
  const patient = await Patient.findOne({ where: { user_id: req.user.id } });
  if (!patient) {
    return res.status(404).json({ success: false, message: 'Patient profile not found' });
  }
  
  const { isActive, limit = 50, page = 1 } = req.query;
  const offset = (page - 1) * limit;
  
  const whereClause = { patient_id: patient.id };
  if (isActive !== undefined) whereClause.isActive = isActive === 'true';
  
  const { count, rows: prescriptions } = await Prescription.findAndCountAll({
    where: whereClause,
    include: [{ model: Doctor, as: 'doctor' }],
    order: [['prescribed_date', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
  
  res.status(200).json({
    success: true,
    count,
    totalPages: Math.ceil(count / limit),
    currentPage: parseInt(page),
    data: prescriptions
  });
});

// Get active prescriptions (for patients)
exports.getMyActivePrescriptions = asyncHandler(async (req, res) => {
  console.log("\nGetting my active prescriptions");
  
  if (req.user.role !== 'patient') {
    return res.status(403).json({ success: false, message: 'Only patients' });
  }
  
  const patient = await Patient.findOne({ where: { user_id: req.user.id } });
  if (!patient) {
    return res.status(404).json({ success: false, message: 'Patient not found' });
  }
  
  const prescriptions = await Prescription.findAll({
    where: {
      patient_id: patient.id,
      isActive: true,
      end_date: { [Op.gte]: new Date() }
    },
    include: [{ model: Doctor, as: 'doctor' }],
    order: [['prescribed_date', 'DESC']]
  });
  
  res.status(200).json({
    success: true,
    count: prescriptions.length,
    data: prescriptions
  });
});

// Mark prescription as completed
exports.markPrescriptionCompleted = asyncHandler(async (req, res) => {
  console.log("\nMarking prescription as completed");
  
  const { prescriptionId } = req.params;
  console.log(prescriptionId);
  
  if (req.user.role !== 'patient') {
    return res.status(403).json({ success: false, message: 'Only patients' });
  }
  
  // Find patient
  const patient = await Patient.findOne({ where: { user_id: req.user.id } });
  if (!patient) {
    return res.status(404).json({ success: false, message: 'Patient profile not found' });
  }
  
  // Check if prescription exists
  const prescription = await Prescription.findByPk(prescriptionId);
  if (!prescription) {
    return res.status(404).json({ success: false, message: 'Prescription not found' });
  }
  
  // Check if prescription belongs to this patient
  if (prescription.patient_id !== patient.id) {
    return res.status(403).json({ 
      success: false, 
      message: 'You do not have permission to mark this prescription as completed' 
    });
  }
  
  // Mark as completed
  await prescription.update({ isActive: false });
  
  res.status(200).json({ 
    success: true, 
    message: 'Prescription marked as completed', 
    data: prescription 
  });
});

// Get prescription statistics
exports.getPrescriptionStats = asyncHandler(async (req, res) => {
  console.log("\nGetting prescription statistics");
  
  let whereClause = {};
  
  if (req.user.role === 'doctor') {
    const doctor = await Doctor.findOne({ where: { user_id: req.user.id } });
    if (doctor) whereClause.doctor_id = doctor.id;
  } else if (req.user.role === 'patient') {
    const patient = await Patient.findOne({ where: { user_id: req.user.id } });
    if (patient) whereClause.patient_id = patient.id;
  }
  
  const totalPrescriptions = await Prescription.count({ where: whereClause });
  const activePrescriptions = await Prescription.count({
    where: { ...whereClause, isActive: true, end_date: { [Op.gte]: new Date() } }
  });
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentPrescriptions = await Prescription.count({
    where: { ...whereClause, prescribed_date: { [Op.gte]: thirtyDaysAgo } }
  });
  
  res.status(200).json({
    success: true,
    data: { totalPrescriptions, activePrescriptions, recentPrescriptions }
  });
});