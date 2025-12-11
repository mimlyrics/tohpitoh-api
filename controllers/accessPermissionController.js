const { models: {AccessPermission, Doctor, Laboratory, LabTest, Patient, User} } = require('../models');
const { Op } = require('sequelize');  
const asyncHandler = require('express-async-handler');

exports.grantAccess = asyncHandler(async (req, res) => {
  console.log("\nGranting access");
  console.log("Authenticated user:", req.user);
  
  const { granted_to_id, access_type, expires_at, purpose } = req.body;
  
  // Check if current user is a patient
  if (req.user.role !== 'patient') {
    return res.status(403).json({ 
      success: false, 
      message: 'Only patients can grant access to their records' 
    });
  }
  
  // Find patient profile for authenticated user
  const patient = await Patient.findOne({ where: { user_id: req.user.id } });
  
  if (!patient) {
    return res.status(404).json({ 
      success: false, 
      message: 'Patient profile not found for authenticated user' 
    });
  }
  
  // Check if user being granted access is a doctor or laboratory
  const userToGrant = await User.findByPk(granted_to_id);
  
  if (!userToGrant) {
    return res.status(404).json({ 
      success: false, 
      message: 'User to grant access not found' 
    });
  }
  
  // Only allow granting to doctors or laboratories
  if (userToGrant.role !== 'doctor' && userToGrant.role !== 'laboratory') {
    return res.status(400).json({ 
      success: false, 
      message: 'Access can only be granted to doctors or laboratories' 
    });
  }
  
  // Parse expires_at date
  let expiresDate;
  try {
    // Handle different date formats (DD-MM-YYYY or YYYY-MM-DD)
    if (expires_at.includes('-')) {
      const parts = expires_at.split('-');
      if (parts[0].length === 4) {
        // YYYY-MM-DD format
        expiresDate = new Date(expires_at);
      } else {
        // DD-MM-YYYY format
        expiresDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    } else {
      expiresDate = new Date(expires_at);
    }
    
    if (isNaN(expiresDate.getTime())) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid expiration date format. Use DD-MM-YYYY or YYYY-MM-DD' 
      });
    }
  } catch (error) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid expiration date' 
    });
  }
  
  // Check if access permission already exists
  const existingPermission = await AccessPermission.findOne({
    where: {
      patient_id: patient.id,
      granted_to_id,
      is_active: true
    }
  });
  
  if (existingPermission) {
    return res.status(400).json({
      success: false,
      message: 'Access permission already granted to this user',
      data: existingPermission
    });
  }
  
  // Create access permission
  const accessPermission = await AccessPermission.create({
    patient_id: patient.id,
    granted_to_id,
    granted_by_id: req.user.id,
    access_type: access_type || 'view',
    expires_at: expiresDate,
    purpose: purpose || 'Medical consultation',
    is_active: true
  });
  
  // Get complete access permission with relationships
  const createdPermission = await AccessPermission.findOne({
    where: { id: accessPermission.id },
    include: [
      {
        model: Patient,
        as: 'patient',
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name']
        }]
      },
      {
        model: User,
        as: 'grantedTo',
        attributes: ['id', 'first_name', 'last_name', 'email', 'role']
      },
      {
        model: User,
        as: 'grantedBy',
        attributes: ['id', 'first_name', 'last_name', 'email']
      }
    ]
  });
  
  res.status(201).json({
    success: true,
    message: 'Access granted successfully',
    data: createdPermission
  });
});

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