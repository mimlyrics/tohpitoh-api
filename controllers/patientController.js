const asyncHandler = require('express-async-handler');
const {models: {Patient, User, MedicalRecord, Prescription, LabTest}} = require('../models');
const { use } = require('passport');
// Get patient profile (for both self and admin)
exports.getPatientProfile = asyncHandler(async (req, res) => {
  console.log("\nGetting patient profile");
  console.log("Request user:", req.user);
  
  let targetUserId;
  
  // Determine target user ID based on route and permissions
  if (req.params.userId && req.user.role === 'admin') {
    // Admin can view any user's profile
    targetUserId = req.params.userId;
  } else if (req.params.userId && req.user.role !== 'admin') {
    // Non-admin trying to access another user's profile
    return res.status(403).json({
      success: false,
      message: "Unauthorized: You can only view your own profile"
    });
  } else {
    // Default to authenticated user's profile
    targetUserId = req.user.id;
  }
  
  // Check if patient profile exists
  const patient = await Patient.findOne({
    where: {user_id: targetUserId},
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'role']
      }
    ]
  });
  
  if (!patient) {
    return res.status(404).json({
      success: false,
      message: 'Patient profile not found'
    });
  }
  
  // Check if user has permission to view this profile
  // (Admin can view all, user can only view their own)
  if (req.user.role !== 'admin' && req.user.id !== patient.user_id) {
    return res.status(403).json({
      success: false,
      message: "Unauthorized: You can only view your own profile"
    });
  }
  
  res.status(200).json({
    success: true,
    data: patient
  });
});

// Update patient profile for the authenticated user (self-update)
exports.updateMyPatientProfile = asyncHandler(async (req, res) => {
  console.log("\nUpdating patient profile for authenticated user");
  console.log("Request user:", req.user);
  console.log("Request body:", req.body);
  
  const {date_of_birth, height, weight, gender, blood_group, genotype,
         known_allergies, known_diseases, emergency_access_enabled, emergency_access_code} = req.body;
  
  const userId = req.user.id; // Get ID from authenticated user
  console.log("Authenticated user ID:", userId);
  
  // Check if user exists
  const user = await User.findByPk(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  // Check if user already has a patient profile
  let existingPatient = await Patient.findOne({where: {user_id: userId}});
  
  let isFirstTimeCreation = false;
  let patient;
  let newAccessToken = null;
  let roleChanged = false;
  
  if (existingPatient) {
    // Update existing patient profile
    await existingPatient.update({
      date_of_birth: date_of_birth || existingPatient.date_of_birth,
      gender: gender || existingPatient.gender,
      blood_group: blood_group || existingPatient.blood_group,
      genotype: genotype || existingPatient.genotype,
      known_allergies: known_allergies || existingPatient.known_allergies,
      known_diseases: known_diseases || existingPatient.known_diseases,
      emergency_access_enabled: emergency_access_enabled !== undefined 
        ? emergency_access_enabled 
        : existingPatient.emergency_access_enabled,
      emergency_access_code: emergency_access_code || existingPatient.emergency_access_code,
      height: height || existingPatient.height,
      weight: weight || existingPatient.weight
    });
    patient = existingPatient;
  } else {
    // Create new patient profile - FIRST TIME
    isFirstTimeCreation = true;
    patient = await Patient.create({
      user_id: userId,
      date_of_birth,
      gender,
      blood_group,
      genotype,
      known_allergies,
      known_diseases,
      emergency_access_enabled,
      emergency_access_code,
      height,
      weight
    });
    
    // Update user role to 'patient' only if it's currently 'user'
    if (user.role === 'user') {
      await user.update({
        role: 'patient'
      });
      roleChanged = true;
      
      // Generate new access token with updated role
      const { generateAccessToken, generateToken } = require('../utils/generate-token');
      newAccessToken = generateAccessToken(null, user.id, 'patient');
      
      // Also generate and save new refresh token
      const newRefreshToken = generateToken(null, user.id, 'patient');
      const currentTokens = user.refreshToken || [];
      await user.update({
        refreshToken: [...currentTokens, newRefreshToken]
      });
    }
  }

  // Fetch complete profile
  const updatedPatient = await Patient.findOne({
    where: {id: patient.id},
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
    message: isFirstTimeCreation ? 'Patient profile created successfully' : 'Patient profile updated successfully',
    data: updatedPatient,
  };
  
  if (newAccessToken) {
    response.accessToken = newAccessToken;
  }
  
  if (roleChanged) {
    response.message += ' (role updated to patient)';
  }

  res.status(200).json(response);
});


exports.getMedicalRecord = asyncHandler(async (req, res) => {
    const patient = await Patient.findOne({where: {user_id: req.user.id}});

    if(!patient) {
        return res.status(404).json({
            success: false,
            message: 'Patient profile not found'
        })
    }

    const medicalRecords = await MedicalRecord.findAll({
        where: {patient_id: patient.id},
        include: [
            {
                model: Patient,
                as: 'patient',
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['first_name', 'last_name']
                }]
            }
        ],
        order: [['date', 'DESC']]
    })

    return res.status(200).json({
      success: true,
      count: medicalRecords.length,
      data: medicalRecords
    });
}  )


exports.configureEmergencyAccess = asyncHandler(async (req, res) => {
    const { emergency_access_enabled, emergency_access_code } = req.body;

    const patient = await Patient.findOne({ where: { user_id: req.user.id } });
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found'
      });
    }

    await patient.update({
      emergency_access_enabled: emergency_access_enabled !== undefined 
        ? emergency_access_enabled 
        : patient.emergency_access_enabled,
      emergency_access_code: emergency_access_code || patient.emergency_access_code
    });

    res.status(200).json({
      success: true,
      message: 'Emergency access configuration updated',
      data: {
        emergency_access_enabled: patient.emergency_access_enabled,
        emergency_access_code: patient.emergency_access_code
      }
    });
})

exports.getPrescriptions = asyncHandler(async (req, res) => {
    const patient = await Patient.findOne({ where: { user_id: req.user.id } });
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found'
      });
    }

    const prescriptions = await Prescription.findAll({
      where: { patient_id: patient.id },
      order: [['prescribed_date', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: prescriptions.length,
      data: prescriptions
    });
  
})

exports.getLabTests = asyncHandler (async (req, res) => {
    const patient = await Patient.findOne({ where: { user_id: req.user.id } });
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found'
      });
    }

    const labTests = await LabTest.findAll({
      where: { patient_id: patient.id },
      order: [['ordered_date', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: labTests.length,
      data: labTests
    });
  
})