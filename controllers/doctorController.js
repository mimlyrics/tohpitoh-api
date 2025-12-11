const asyncHandler = require('express-async-handler');
const {models: { Doctor, User, Patient, Prescription, MedicalRecord, LabTest, AccessPermission}} = require('../models');
const { Op } = require('sequelize');


// Update doctor profile for authenticated user (self-update)
exports.updateMyDoctorProfile = asyncHandler(async (req, res) => {
  console.log("\nUpdating doctor profile for authenticated user");
  console.log("Request user:", req.user);
  console.log("Request body:", req.body);
  
  const { specialization, license_number, hospital_affiliation } = req.body;
  
  const userId = req.user.id;
  
  // Check if user exists
  const user = await User.findByPk(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  // Check if doctor profile already exists
  let existingDoctor = await Doctor.findOne({ where: { user_id: userId } });
  
  let isFirstTimeCreation = false;
  let doctor;
  let newAccessToken = null;
  let roleChanged = false;
  
  if (existingDoctor) {
    // Doctor cannot update their own profile after approval without admin
    if (existingDoctor.is_approved) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update approved doctor profile. Please contact admin for changes.',
        data: existingDoctor
      });
    }
    
    // Update existing unapproved doctor profile
    await existingDoctor.update({
      specialization: specialization || existingDoctor.specialization,
      license_number: license_number || existingDoctor.license_number,
      hospital_affiliation: hospital_affiliation || existingDoctor.hospital_affiliation
    });
    doctor = existingDoctor;
  } else {
    // Create new doctor profile - FIRST TIME
    isFirstTimeCreation = true;
    doctor = await Doctor.create({
      user_id: userId,
      specialization,
      license_number,
      hospital_affiliation,
      is_approved: false // Default to unapproved
    });
    
    // Update user role to 'doctor' only if it's currently 'user'
    if (user.role === 'user') {
      await user.update({
        role: 'doctor'
      });
      roleChanged = true;
      
      // Generate new access token with updated role
      const { generateAccessToken, generateToken } = require('../utils/generate-token');
      newAccessToken = generateAccessToken(null, user.id, 'doctor');
      
      // Also generate and save new refresh token
      const newRefreshToken = generateToken(null, user.id, 'doctor');
      const currentTokens = user.refreshToken || [];
      await user.update({
        refreshToken: [...currentTokens, newRefreshToken]
      });
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
    message: isFirstTimeCreation ? 'Doctor profile created successfully (pending admin approval)' : 'Doctor profile updated successfully (pending admin approval)',
    data: updatedDoctor,
    note: 'Doctor profile requires admin approval before it can be used'
  };
  
  if (newAccessToken) {
    response.accessToken = newAccessToken;
  }
  
  if (roleChanged) {
    response.message += ' (role updated to doctor)';
  }

  res.status(200).json(response);
});




// Get authenticated doctor's own profile
exports.getMyDoctorProfile = asyncHandler(async (req, res) => {
  console.log("\nGetting authenticated doctor's profile");
  
  const userId = req.user.id;
  
  const doctor = await Doctor.findOne({
    where: { user_id: userId },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'role']
      }
    ]
  });
  
  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: 'Doctor profile not found. Please create a profile first.',
      hasProfile: false
    });
  }
  
  res.status(200).json({
    success: true,
    data: doctor,
    hasProfile: true
  });
});


// Get all doctors (for admin dashboard or patient search)
exports.getAllDoctors = asyncHandler(async (req, res) => {
  console.log("\nGetting all doctors");
  
  const { approvedOnly = true, specialty } = req.query;
  
  // Build where clause
  const whereClause = {};
  
  if (approvedOnly === 'true' || approvedOnly === true) {
    whereClause.is_approved = true;
  }
  
  if (specialty) {
    whereClause.specialization = {
      [Op.iLike]: `%${specialty}%`
    };
  }
  
  const doctors = await Doctor.findAll({
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
    order: [['created_at', 'DESC']]
  });
  
  res.status(200).json({
    success: true,
    count: doctors.length,
    data: doctors
  });
});





// view authorized patient records
exports.getAuthorizedPatientRecords = asyncHandler(async (req, res) => {
    const {patient_id} = req.params; 
    const hasAccess = await AccessPermission.findOne({
        where: {
            patient_id,
            granted_to_id: req.user.id,
            is_active: true,
            expires_at: {[Op.gt]: new Date()}
        }
    })

    if(!hasAccess) {
        return res.status(403).json({success: false, message:'Access denied to patient records'});
    }

    // Get patient records
    const medicalRecords = await MedicalRecord.findAll({
      where: { patient_id },
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
    });

    const prescriptions = await Prescription.findAll({
      where: { patient_id },
      order: [['prescribed_date', 'DESC']]
    });

    const labTests = await LabTest.findAll({
      where: { patient_id },
      order: [['ordered_date', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: {
        medicalRecords,
        prescriptions,
        labTests
      }
    }
    )
    
})

// view and interpret lab results
exports.interpretLabResults = asyncHandler(async (req, res) => {
    const {doctor_id}  = req.params;
    const {lab_test_id, doctor_interpretation} = req.params;

    const labTest = await LabTest.findByPk(lab_test_id);
    if(!labTest) {
        return res.status(404).json({
            success: false,
            message: 'Lab test not found'
        })
    }

    await LabTest.update({
        doctor_interpretation: doctor_interpretation || labTest.doctor_interpretation,
        verified_by_doctor: true
    })

    res.status(200).json({
        success: true,
        message: 'Lab results interpretation added',
        data: labTest
    })

})