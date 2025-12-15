const { models: { User, Doctor, Laboratory, AccessPermission, Patient, MedicalRecord, Prescription, LabTest } } = require('../models');
const { Op } = require('sequelize');

// Validate professional registration
exports.validateProfessional = async (req, res) => {
  try {
    const { user_id, role } = req.body;

    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!['doctor', 'laboratory'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Can only validate doctors and laboratories'
      });
    }

    if (user.role !== role) {
      return res.status(400).json({
        success: false,
        message: `User role is not ${role}`
      });
    }

    if (role === 'doctor') {
      let doctor = await Doctor.findOne({ where: { user_id } });
      
      if (!doctor) {
        doctor = await Doctor.create({
          user_id,
          is_approved: true,
          approved_by_admin_id: req.user.id,
          approved_at: new Date()
        });
      } else {
        await doctor.update({
          is_approved: true,
          approved_by_admin_id: req.user.id,
          approved_at: new Date()
        });
      }

      // Update user verification status
      await user.update({ is_verified: true });

      return res.status(200).json({
        success: true,
        message: 'Doctor validated successfully',
        data: doctor
      });
    }

    if (role === 'laboratory') {
      let laboratory = await Laboratory.findOne({ where: { user_id } });
      
      if (!laboratory) {
        laboratory = await Laboratory.create({
          user_id,
          is_approved: true,
          approved_by_admin_id: req.user.id,
          approved_at: new Date()
        });
      } else {
        await laboratory.update({
          is_approved: true,
          approved_by_admin_id: req.user.id,
          approved_at: new Date()
        });
      }

      // Update user verification status
      await user.update({ is_verified: true });

      return res.status(200).json({
        success: true,
        message: 'Laboratory validated successfully',
        data: laboratory
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error validating professional',
      error: error.message
    });
  }
};

// Get pending validations
exports.getPendingValidations = async (req, res) => {
  try {
    const pendingDoctors = await Doctor.findAll({
      where: { is_approved: false },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
      }]
    });

    const pendingLaboratories = await Laboratory.findAll({
      where: { is_approved: false },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
      }]
    });

    res.status(200).json({
      success: true,
      data: {
        pendingDoctors,
        pendingLaboratories
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching pending validations',
      error: error.message
    });
  }
};

// Manage user accounts
exports.manageUserAccount = async (req, res) => {
  try {
    const { user_id, action, new_role } = req.body;

    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (action === 'deactivate') {
      await user.update({ is_active: false });
      return res.status(200).json({
        success: true,
        message: 'User account deactivated successfully'
      });
    }

    if (action === 'activate') {
      await user.update({ is_active: true });
      return res.status(200).json({
        success: true,
        message: 'User account activated successfully'
      });
    }

    if (action === 'change_role' && new_role) {
      await user.update({ role: new_role });
      return res.status(200).json({
        success: true,
        message: `User role changed to ${new_role}`
      });
    }

    if (action === 'reset_password') {
      // Generate reset token logic here
      const resetToken = 'generated_token_here'; // Implement token generation
      await user.update({
        reset_password_token: resetToken,
        reset_password_expires: new Date(Date.now() + 3600000) // 1 hour
      });

      return res.status(200).json({
        success: true,
        message: 'Password reset initiated. Token generated.',
        reset_token: resetToken
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid action specified'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error managing user account',
      error: error.message
    });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'first_name', 'last_name', 'email', 'role', 'is_verified', 'is_active', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// Get system statistics
exports.getSystemStatistics = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const totalPatients = await User.count({ where: { role: 'patient' } });
    const totalDoctors = await User.count({ where: { role: 'doctor' } });
    const totalLaboratories = await User.count({ where: { role: 'laboratory' } });
    const totalMedicalRecords = await MedicalRecord.count();
    const totalPrescriptions = await Prescription.count();
    const totalLabTests = await LabTest.count();
    const totalActiveAccesses = await AccessPermission.count({
      where: {
        is_active: true,
        expires_at: { [Op.gt]: new Date() }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalPatients,
        totalDoctors,
        totalLaboratories,
        totalMedicalRecords,
        totalPrescriptions,
        totalLabTests,
        totalActiveAccesses
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching system statistics',
      error: error.message
    });
  }
};

// Validate access requests (admin oversight)
exports.validateAccessRequests = async (req, res) => {
  try {
    const accessPermissions = await AccessPermission.findAll({
      where: {
        expires_at: { [Op.gt]: new Date() }
      },
      include: [
        {
          model: User,
          as: 'grantedTo',
          attributes: ['id', 'first_name', 'last_name', 'email', 'role']
        },
        {
          model: User,
          as: 'grantedBy',
          attributes: ['id', 'first_name', 'last_name', 'email', 'role']
        },
        {
          model: Patient,
          as: 'patient',
          include: [{
            model: User,
            as: 'user',
            attributes: ['first_name', 'last_name', 'email']
          }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: accessPermissions.length,
      data: accessPermissions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching access requests',
      error: error.message
    });
  }
};


/**
 * Get all medical records for admin
 */
exports.getAllMedicalRecords = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            record_type = '',
            start_date,
            end_date,
            is_shared
        } = req.query;

        const offset = (page - 1) * limit;
        
        // Build where clause
        const where = {};
        
        if (search) {
            where[Op.or] = [
                { title: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } }
            ];
        }
        
        if (record_type) {
            where.record_type = record_type;
        }
        
        if (start_date || end_date) {
            where.date = {};
            if (start_date) where.date[Op.gte] = start_date;
            if (end_date) where.date[Op.lte] = end_date;
        }
        
        if (is_shared !== undefined) {
            where.is_shared = is_shared === 'true';
        }

        // Get total count
        const total = await MedicalRecord.count({ 
            where,
            paranoid: false // Include soft-deleted records
        });

        // Get records with patient and doctor info
        const records = await MedicalRecord.findAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']],
            paranoid: false, // Include soft-deleted records
            include: [
                {
                    model: Patient,
                    as: 'patient',
                    attributes: ['id', 'date_of_birth', 'blood_type', 'height', 'weight'],
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
                    }]
                },
                {
                    model: User,
                    as: 'doctor',
                    attributes: ['id', 'first_name', 'last_name', 'email']
                },
                {
                    model: Laboratory,
                    as: 'laboratory',
                    attributes: ['id', 'lab_name', 'address']
                }
            ]
        });

        res.status(200).json({
            success: true,
            data: {
                records,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Error fetching medical records:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch medical records',
            error: error.message
        });
    }
};

/**
 * Get all prescriptions for admin
 */
exports.getAllPrescriptions = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            is_active,
            start_date,
            end_date
        } = req.query;

        const offset = (page - 1) * limit;
        
        // Build where clause
        const where = {};
        
        if (search) {
            where[Op.or] = [
                { medication_name: { [Op.iLike]: `%${search}%` } },
                { dosage: { [Op.iLike]: `%${search}%` } },
                { instructions: { [Op.iLike]: `%${search}%` } }
            ];
        }
        
        if (is_active !== undefined) {
            where.isActive = is_active === 'true';
        }
        
        if (start_date || end_date) {
            where.prescribed_date = {};
            if (start_date) where.prescribed_date[Op.gte] = start_date;
            if (end_date) where.prescribed_date[Op.lte] = end_date;
        }

        // Get total count
        const total = await Prescription.count({ 
            where,
            paranoid: false
        });

        // Get prescriptions with patient and doctor info
        const prescriptions = await Prescription.findAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['prescribed_date', 'DESC']],
            paranoid: false,
            include: [
                {
                    model: Patient,
                    as: 'patient',
                    attributes: ['id'],
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
                    }]
                },
                {
                    model: Doctor,
                    as: 'doctor',
                    attributes: ['id', 'specialization'],
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id', 'first_name', 'last_name', 'email']
                    }]
                }
            ]
        });

        res.status(200).json({
            success: true,
            data: {
                prescriptions,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Error fetching prescriptions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch prescriptions',
            error: error.message
        });
    }
};

/**
 * Get all lab tests for admin
 */
exports.getAllLabTests = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            status = '',
            start_date,
            end_date
        } = req.query;

        const offset = (page - 1) * limit;
        
        // Build where clause
        const where = {};
        
        if (search) {
            where[Op.or] = [
                { test_name: { [Op.iLike]: `%${search}%` } },
                { results: { [Op.iLike]: `%${search}%` } }
            ];
        }
        
        if (status) {
            where.status = status;
        }
        
        if (start_date || end_date) {
            where.ordered_date = {};
            if (start_date) where.ordered_date[Op.gte] = start_date;
            if (end_date) where.ordered_date[Op.lte] = end_date;
        }

        // Get total count
        const total = await LabTest.count({ 
            where,
            paranoid: false
        });

        // Get lab tests with patient, doctor, and lab info
        const labTests = await LabTest.findAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['ordered_date', 'DESC']],
            paranoid: false,
            include: [
                {
                    model: Patient,
                    as: 'patient',
                    attributes: ['id'],
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
                    }]
                },
                {
                    model: Doctor,
                    as: 'doctor',
                    attributes: ['id', 'specialization'],
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id', 'first_name', 'last_name', 'email']
                    }]
                },
                {
                    model: Laboratory,
                    as: 'laboratory',
                    attributes: ['id', 'lab_name', 'address', 'phone']
                }
            ]
        });

        res.status(200).json({
            success: true,
            data: {
                labTests,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Error fetching lab tests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch lab tests',
            error: error.message
        });
    }
};