
const asyncHandler = require('express-async-handler');
const {models: { Doctor, User, Patient, Prescription, MedicalRecord, LabTest, AccessPermission}} = require('../models');
const { Op } = require('sequelize');


// Admin add medical record for any patient/doctor
exports.addMedicalRecordByAdmin = asyncHandler(async (req, res) => {
  console.log("\nAdmin adding medical record");
  console.log("Admin user:", req.user);
  console.log("Request body:", req.body);
  
  const { patientId, doctorId } = req.params;
  const { record_type, title, description, attachment_url, date, is_shared, shared_until } = req.body;
  
  // Check if patient exists
  const patient = await Patient.findOne({ where: { id: patientId } });
  if (!patient) {
    return res.status(404).json({
      success: false,
      message: 'Patient not found'
    });
  }
  
  // Check if doctor exists (if provided)
  let doctor = null;
  if (doctorId) {
    doctor = await Doctor.findOne({ where: { id: doctorId } });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }
  }
  
  // Create medical record (admin can add records without doctor association)
  const medicalRecord = await MedicalRecord.create({
    patient_id: patientId,
    doctor_id: doctor ? doctor.id : null,
    record_type: record_type || "consultation",
    title,
    description,
    date: date || new Date(),
    attachment_url,
    is_shared: is_shared || false,
    shared_until: is_shared ? shared_until : null
  });
  
  // Fetch complete record
  const createdRecord = await MedicalRecord.findOne({
    where: { id: medicalRecord.id },
    include: [
      {
        model: User,
        as: 'patient',
        attributes: ['id', 'first_name', 'last_name']
      },
      {
        model: User,
        as: 'doctor',
        attributes: ['id', 'first_name', 'last_name']
      }
    ]
  });
  
  res.status(201).json({
    success: true,
    message: 'Medical record added successfully by admin',
    data: createdRecord,
    adminAction: {
      performedBy: `${req.user.first_name} ${req.user.last_name}`,
      adminId: req.user.id
    }
  });
});


