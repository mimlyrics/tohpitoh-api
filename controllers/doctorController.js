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

/**
 * Get all doctors (for admin and patients)
 */
exports.getAllDoctors = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            search = '',
            specialization = '',
            verified = 'true' 
        } = req.query;

        const offset = (page - 1) * limit;
        
        // Build where clause
        const where = { is_verified: verified === 'true' };
        
        if (search) {
            where[Op.or] = [
                { specialization: { [Op.iLike]: `%${search}%` } },
                { hospital_affiliation: { [Op.iLike]: `%${search}%` } },
                { license_number: { [Op.iLike]: `%${search}%` } }
            ];
        }
        
        if (specialization) {
            where.specialization = { [Op.iLike]: `%${specialization}%` };
        }

        // Get total count
        const total = await Doctor.count({ where });

        // Get doctors with user info
        const doctors = await Doctor.findAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']],
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'avatar']
            }]
        });

        res.status(200).json({
            success: true,
            data: {
                doctors,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch doctors',
            error: error.message
        });
    }
};

exports.getPatientById = async (req, res) => {
    try {
        const doctorId = req.user.id;
        const patientId = req.params.patientId;
        
        // Check if doctor is approved
        const doctor = await Doctor.findOne({ where: { user_id: doctorId } });
        if (!doctor || !doctor.is_verified) {
            return res.status(403).json({
                success: false,
                message: 'You must be an approved doctor to view patient details'
            });
        }

        const patient = await Patient.findByPk(patientId, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'avatar']
                }
            ]
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        // Get medical history from this doctor for this patient
        const medicalRecords = await MedicalRecord.findAll({
            where: {
                patient_id: patientId,
                doctor_id: doctor.id
            },
            order: [['date', 'DESC']],
            limit: 10
        });

        // Get active prescriptions from this doctor
        const activePrescriptions = await Prescription.findAll({
            where: {
                patient_id: patientId,
                doctor_id: doctor.id,
                isActive: true
            },
            order: [['prescribed_date', 'DESC']]
        });

        // Get lab tests from this doctor
        const labTests = await LabTest.findAll({
            where: {
                patient_id: patientId,
                doctor_id: doctor.id
            },
            order: [['ordered_date', 'DESC']],
            limit: 10
        });

        const patientData = patient.toJSON();
        patientData.medical_history = medicalRecords;
        patientData.active_prescriptions = activePrescriptions;
        patientData.lab_tests = labTests;

        res.status(200).json({
            success: true,
            data: patientData
        });

    } catch (error) {
        console.error('Error fetching patient:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch patient',
            error: error.message
        });
    }
};

/**
 * Get doctor's patients (patients they've worked with)
 */
exports.getMyPatients = async (req, res) => {
    try {
        const doctorId = req.user.id;
        
        // Check if doctor is approved
        const doctor = await Doctor.findOne({ where: { user_id: doctorId } });
        if (!doctor || !doctor.is_verified) {
            return res.status(403).json({
                success: false,
                message: 'You must be an approved doctor to access your patients'
            });
        }

        const { 
            page = 1, 
            limit = 20, 
            search = '',
            sort_by = 'recent'
        } = req.query;

        const offset = (page - 1) * limit;
        
        // First, get patient IDs from medical records created by this doctor
        const medicalRecords = await MedicalRecord.findAll({
            where: { doctor_id: doctor.id },
            attributes: ['patient_id'],
            group: ['patient_id']
        });

        const patientIds = medicalRecords.map(record => record.patient_id);

        if (patientIds.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    patients: [],
                    pagination: {
                        total: 0,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        pages: 0
                    }
                }
            });
        }

        // Build where clause
        const where = {
            id: { [Op.in]: patientIds }
        };
        
        if (search) {
            where[Op.or] = [
                { '$user.first_name$': { [Op.iLike]: `%${search}%` } },
                { '$user.last_name$': { [Op.iLike]: `%${search}%` } },
                { '$user.email$': { [Op.iLike]: `%${search}%` } },
                { '$user.phone$': { [Op.iLike]: `%${search}%` } }
            ];
        }

        // Determine sort order
        let order = [];
        switch (sort_by) {
            case 'name_asc':
                order = [[{ model: User, as: 'user' }, 'first_name', 'ASC']];
                break;
            case 'name_desc':
                order = [[{ model: User, as: 'user' }, 'first_name', 'DESC']];
                break;
            case 'recent':
                order = [[{ model: User, as: 'user' }, 'created_at', 'DESC']];
                break;
            default:
                order = [[{ model: User, as: 'user' }, 'first_name', 'ASC']];
        }

        // Get total count
        const total = await Patient.count({
            where,
            include: [{
                model: User,
                as: 'user',
                attributes: []
            }]
        });

        // Get patients with user info
        const patients = await Patient.findAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order,
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'avatar']
            }]
        });

        res.status(200).json({
            success: true,
            data: {
                patients,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Error fetching my patients:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch my patients',
            error: error.message
        });
    }
};


/**
 * Get all patients (doctor can see any patient if approved)
 */
exports.getPatients = async (req, res) => {
    try {
        const doctorId = req.user.id;
        
        // Check if doctor is approved
        const doctor = await Doctor.findOne({ where: { user_id: doctorId } });
        if (!doctor || !doctor.is_verified) {
            return res.status(403).json({
                success: false,
                message: 'You must be an approved doctor to access patients'
            });
        }

        const { 
            page = 1, 
            limit = 20, 
            search = '',
            sort_by = 'name_asc',
            has_medical_records = 'false'
        } = req.query;

        const offset = (page - 1) * limit;
        
        // Build where clause for patients
        const where = {};
        
        if (search) {
            where[Op.or] = [
                { '$user.first_name$': { [Op.iLike]: `%${search}%` } },
                { '$user.last_name$': { [Op.iLike]: `%${search}%` } },
                { '$user.email$': { [Op.iLike]: `%${search}%` } },
                { '$user.phone$': { [Op.iLike]: `%${search}%` } }
            ];
        }

        // Determine sort order
        let order = [];
        switch (sort_by) {
            case 'name_asc':
                order = [[{ model: User, as: 'user' }, 'first_name', 'ASC']];
                break;
            case 'name_desc':
                order = [[{ model: User, as: 'user' }, 'first_name', 'DESC']];
                break;
            case 'recent':
                order = [[{ model: User, as: 'user' }, 'created_at', 'DESC']];
                break;
            case 'oldest':
                order = [[{ model: User, as: 'user' }, 'created_at', 'ASC']];
                break;
            default:
                order = [[{ model: User, as: 'user' }, 'first_name', 'ASC']];
        }

        // Get total count
        const total = await Patient.count({
            where,
            include: [{
                model: User,
                as: 'user',
                attributes: []
            }]
        });

        // Get patients with user info
        const patients = await Patient.findAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order,
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'avatar']
            }]
        });

        // If requested, add medical record info for each patient from this doctor
        if (has_medical_records === 'true') {
            const patientsWithRecords = await Promise.all(
                patients.map(async (patient) => {
                    const patientData = patient.toJSON();
                    
                    // Get last medical record from this doctor for this patient
                    const lastRecord = await MedicalRecord.findOne({
                        where: {
                            patient_id: patient.id,
                            doctor_id: doctor.id
                        },
                        order: [['date', 'DESC']],
                        attributes: ['id', 'title', 'record_type', 'date']
                    });
                    
                    // Get prescription count from this doctor
                    const prescriptionCount = await Prescription.count({
                        where: {
                            patient_id: patient.id,
                            doctor_id: doctor.id,
                            isActive: true
                        }
                    });
                    
                    // Get lab test count from this doctor
                    const labTestCount = await LabTest.count({
                        where: {
                            patient_id: patient.id,
                            doctor_id: doctor.id,
                            status: { [Op.in]: ['pending', 'in_progress'] }
                        }
                    });
                    
                    patientData.last_consultation = lastRecord;
                    patientData.active_prescriptions = prescriptionCount;
                    patientData.pending_tests = labTestCount;
                    
                    return patientData;
                })
            );

            res.status(200).json({
                success: true,
                data: {
                    patients: patientsWithRecords,
                    pagination: {
                        total,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        } else {
            res.status(200).json({
                success: true,
                data: {
                    patients,
                    pagination: {
                        total,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        }

    } catch (error) {
        console.error('Error fetching patients:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch patients',
            error: error.message
        });
    }
};


/**
 * Search patients for a doctor
 */
exports.searchPatients = async (req, res) => {
    try {
        const doctorId = req.user.id;
        const { q } = req.query;
        
        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters'
            });
        }

        // First, get patient IDs from medical records created by this doctor
        const medicalRecords = await MedicalRecord.findAll({
            where: { doctor_id: doctorId },
            attributes: ['patient_id'],
            group: ['patient_id']
        });

        const patientIds = medicalRecords.map(record => record.patient_id);

        if (patientIds.length === 0) {
            return res.status(200).json({
                success: true,
                data: []
            });
        }

        const patients = await Patient.findAll({
            where: {
                id: { [Op.in]: patientIds },
                [Op.or]: [
                    { '$user.first_name$': { [Op.iLike]: `%${q}%` } },
                    { '$user.last_name$': { [Op.iLike]: `%${q}%` } },
                    { '$user.email$': { [Op.iLike]: `%${q}%` } },
                    { '$user.phone$': { [Op.iLike]: `%${q}%` } }
                ]
            },
            limit: 20,
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
            }],
            order: [[{ model: User, as: 'user' }, 'first_name', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: patients
        });

    } catch (error) {
        console.error('Error searching patients:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search patients',
            error: error.message
        });
    }
};

/**
 * Get doctor's medical record statistics
 */
exports.getMedicalRecordStats = async (req, res) => {
    try {
        const doctorId = req.user.id;
        
        // Get counts by record type
        const recordTypeStats = await MedicalRecord.findAll({
            where: { doctor_id: doctorId },
            attributes: [
                'record_type',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['record_type']
        });

        // Get monthly statistics for the last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyStats = await MedicalRecord.findAll({
            where: {
                doctor_id: doctorId,
                created_at: { [Op.gte]: sixMonthsAgo }
            },
            attributes: [
                [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('created_at')), 'month'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('created_at'))],
            order: [[sequelize.fn('DATE_TRUNC', 'month', sequelize.col('created_at')), 'ASC']]
        });

        // Get today's count
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayCount = await MedicalRecord.count({
            where: {
                doctor_id: doctorId,
                created_at: { [Op.gte]: today }
            }
        });

        // Get patient count
        const patientCount = await MedicalRecord.count({
            where: { doctor_id: doctorId },
            attributes: ['patient_id'],
            group: ['patient_id']
        });

        res.status(200).json({
            success: true,
            data: {
                total_records: await MedicalRecord.count({ where: { doctor_id: doctorId } }),
                record_type_stats: recordTypeStats,
                monthly_stats: monthlyStats,
                today_count: todayCount,
                unique_patients: patientCount.length
            }
        });

    } catch (error) {
        console.error('Error fetching medical record stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch medical record statistics',
            error: error.message
        });
    }
};

/**
 * Get doctor's prescription statistics
 */
exports.getPrescriptionStats = async (req, res) => {
    try {
        const doctorId = req.user.id;
        
        // Get total active prescriptions
        const activePrescriptions = await Prescription.count({
            where: {
                doctor_id: doctorId,
                isActive: true
            }
        });

        // Get prescriptions by month
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyPrescriptions = await Prescription.findAll({
            where: {
                doctor_id: doctorId,
                prescribed_date: { [Op.gte]: sixMonthsAgo }
            },
            attributes: [
                [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('prescribed_date')), 'month'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('prescribed_date'))],
            order: [[sequelize.fn('DATE_TRUNC', 'month', sequelize.col('prescribed_date')), 'ASC']]
        });

        // Get most prescribed medications
        const topMedications = await Prescription.findAll({
            where: { doctor_id: doctorId },
            attributes: [
                'medication_name',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['medication_name'],
            order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
            limit: 10
        });

        res.status(200).json({
            success: true,
            data: {
                active_prescriptions: activePrescriptions,
                total_prescriptions: await Prescription.count({ where: { doctor_id: doctorId } }),
                monthly_prescriptions: monthlyPrescriptions,
                top_medications: topMedications
            }
        });

    } catch (error) {
        console.error('Error fetching prescription stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch prescription statistics',
            error: error.message
        });
    }
};