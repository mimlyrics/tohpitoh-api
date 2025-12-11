const { AccessPermission, Patient, User } = require('../models');

// Grant temporary access to doctor
exports.grantAccess = async (req, res) => {
  try {
    const { granted_to_id, access_type, expires_at, purpose } = req.body;

    // Get patient profile
    const patient = await Patient.findOne({ where: { user_id: req.user.id } });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found'
      });
    }

    // Check if user exists and is a doctor
    const doctor = await User.findOne({
      where: { 
        id: granted_to_id,
        role: 'doctor'
      }
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Check if access already exists and is still valid
    const existingAccess = await AccessPermission.findOne({
      where: {
        patient_id: patient.id,
        granted_to_id,
        is_active: true,
        expires_at: { [Op.gt]: new Date() }
      }
    });

    if (existingAccess) {
      return res.status(400).json({
        success: false,
        message: 'Access already granted to this doctor'
      });
    }

    // Create new access permission
    const accessPermission = await AccessPermission.create({
      patient_id: patient.id,
      granted_to_id,
      granted_by_id: req.user.id,
      access_type,
      expires_at: new Date(expires_at),
      purpose
    });

    res.status(201).json({
      success: true,
      message: 'Access granted successfully',
      data: accessPermission
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error granting access',
      error: error.message
    });
  }
};

// Revoke access
exports.revokeAccess = async (req, res) => {
  try {
    const { access_permission_id } = req.params;

    const patient = await Patient.findOne({ where: { user_id: req.user.id } });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found'
      });
    }

    const accessPermission = await AccessPermission.findOne({
      where: {
        id: access_permission_id,
        patient_id: patient.id,
        granted_by_id: req.user.id
      }
    });

    if (!accessPermission) {
      return res.status(404).json({
        success: false,
        message: 'Access permission not found'
      });
    }

    await accessPermission.update({
      is_active: false
    });

    res.status(200).json({
      success: true,
      message: 'Access revoked successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error revoking access',
      error: error.message
    });
  }
};

// Get all granted accesses
exports.getGrantedAccesses = async (req, res) => {
  try {
    const patient = await Patient.findOne({ where: { user_id: req.user.id } });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found'
      });
    }

    const accessPermissions = await AccessPermission.findAll({
      where: {
        patient_id: patient.id,
        granted_by_id: req.user.id
      },
      include: [
        {
          model: User,
          as: 'grantedTo',
          attributes: ['id', 'first_name', 'last_name', 'email', 'role']
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
      message: 'Error fetching granted accesses',
      error: error.message
    });
  }
};

// Check if doctor has access to patient records
exports.checkDoctorAccess = async (req, res) => {
  try {
    const { patient_id } = req.params;

    const hasAccess = await AccessPermission.findOne({
      where: {
        patient_id,
        granted_to_id: req.user.id,
        is_active: true,
        expires_at: { [Op.gt]: new Date() }
      }
    });

    res.status(200).json({
      success: true,
      has_access: !!hasAccess,
      access_details: hasAccess || null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking access',
      error: error.message
    });
  }
};