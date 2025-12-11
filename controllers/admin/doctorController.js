const asyncHandler = require('express-async-handler');
const {models: { Doctor, User, Patient, Prescription, MedicalRecord, LabTest, AccessPermission}} = require('../../models');
const { Op } = require('sequelize');


// Admin get any doctor's profile
exports.getDoctorProfileByAdmin = asyncHandler(async (req, res) => {
  console.log("\nAdmin getting doctor profile");
  
  const { userId } = req.params;
  
  const doctor = await Doctor.findOne({
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
  
  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: 'Doctor profile not found for this user'
    });
  }
  
  res.status(200).json({
    success: true,
    data: doctor
  });
});


// Admin update doctor profile for any user
exports.updateDoctorProfileByAdmin = asyncHandler(async (req, res) => {
  console.log("\nAdmin updating doctor profile");
  console.log("Admin user:", req.user);
  console.log("Request body:", req.body);
  
  const { specialization, license_number, hospital_affiliation, is_approved } = req.body;
  
  const { userId } = req.params;
  console.log("Target doctor user ID:", userId);
  
  // Check if target user exists
  const user = await User.findByPk(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Target user not found'
    });
  }
  
  // Check if doctor profile exists
  let existingDoctor = await Doctor.findOne({ where: { user_id: userId } });
  
  let isFirstTimeCreation = false;
  let doctor;
  let roleChanged = false;
  
  if (existingDoctor) {
    // Admin updates existing doctor profile
    const updateData = {
      specialization: specialization || existingDoctor.specialization,
      license_number: license_number || existingDoctor.license_number,
      hospital_affiliation: hospital_affiliation || existingDoctor.hospital_affiliation
    };
    
    // Only update approval fields if provided
    if (is_approved !== undefined) {
      updateData.is_approved = is_approved;
      updateData.approved_by_admin_id = req.user.id;
      updateData.approved_at = is_approved ? new Date() : null;
    }
    
    await existingDoctor.update(updateData);
    doctor = existingDoctor;
  } else {
    // Admin creates new doctor profile for user
    isFirstTimeCreation = true;
    const createData = {
      user_id: userId,
      specialization,
      license_number,
      hospital_affiliation
    };
    
    // Admin can set approval status directly
    if (is_approved !== undefined) {
      createData.is_approved = is_approved;
      createData.approved_by_admin_id = req.user.id;
      createData.approved_at = is_approved ? new Date() : null;
    } else {
      createData.is_approved = false; // Default to unapproved
    }
    
    doctor = await Doctor.create(createData);
    
    // Admin can also update user role if needed
    if (user.role === 'user') {
      await user.update({
        role: 'doctor'
      });
      roleChanged = true;
    }
  }

  // Fetch complete profile
  const updatedDoctor = await Doctor.findOne({
    where: { id: doctor.id },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'role']
      }
    ]
  });

  // Prepare response
  const response = {
    success: true,
    message: isFirstTimeCreation ? 'Doctor profile created successfully by admin' : 'Doctor profile updated successfully by admin',
    data: updatedDoctor,
    adminAction: {
      performedBy: `${req.user.first_name} ${req.user.last_name}`,
      adminId: req.user.id
    }
  };
  
  if (roleChanged) {
    response.message += ' (role updated to doctor)';
  }
  
  if (doctor.is_approved) {
    response.note = 'Doctor profile is approved and active';
  } else {
    response.note = 'Doctor profile is pending approval';
  }

  res.status(200).json(response);
});


// Approve doctor profile (admin only)
exports.approveDoctorProfile = asyncHandler(async (req, res) => {
  console.log("\nAdmin approving doctor profile");
  
  const { doctorId } = req.params;
  
  // Find doctor by ID (not user_id)
  const doctor = await Doctor.findByPk(doctorId, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'first_name', 'last_name', 'email', 'role']
      }
    ]
  });
  
  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: 'Doctor profile not found'
    });
  }
  
  if (doctor.is_approved) {
    return res.status(400).json({
      success: false,
      message: 'Doctor profile is already approved',
      data: doctor
    });
  }
  
  // Update approval status
  await doctor.update({
    is_approved: true,
    approved_by_admin_id: req.user.id,
    approved_at: new Date()
  });
  
  // Update user role to doctor if not already
  if (doctor.user.role !== 'doctor') {
    await doctor.user.update({
      role: 'doctor'
    });
  }
  
  // Refresh doctor data
  const approvedDoctor = await Doctor.findByPk(doctorId, {
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
    message: `Doctor profile approved successfully for ${approvedDoctor.user.first_name} ${approvedDoctor.user.last_name}`,
    data: approvedDoctor,
    adminAction: {
      performedBy: `${req.user.first_name} ${req.user.last_name}`,
      adminId: req.user.id,
      approvedAt: approvedDoctor.approved_at
    }
  });
});



