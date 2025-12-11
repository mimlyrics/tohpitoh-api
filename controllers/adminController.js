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