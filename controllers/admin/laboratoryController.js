const asyncHandler = require('express-async-handler');
const {models: {Laboratory, User, LabTest }} = require('../../models');


// Admin update laboratory profile for any user
exports.updateLaboratoryProfileByAdmin = asyncHandler(async (req, res) => {
  console.log("\nAdmin updating laboratory profile");
  console.log("Admin user:", req.user);
  console.log("Request body:", req.body);
  
  const { lab_name, license_number, address, is_approved } = req.body;
  
  const { userId } = req.params;
  console.log("Target laboratory user ID:", userId);
  
  // Check if target user exists
  const user = await User.findByPk(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Target user not found'
    });
  }
  
  // Check if laboratory profile exists
  let existingLaboratory = await Laboratory.findOne({ where: { user_id: userId } });
  
  let isFirstTimeCreation = false;
  let laboratory;
  let roleChanged = false;
  
  if (existingLaboratory) {
    // Admin updates existing laboratory profile
    const updateData = {
      lab_name: lab_name || existingLaboratory.lab_name,
      license_number: license_number || existingLaboratory.license_number,
      address: address || existingLaboratory.address
    };
    
    // Only update approval fields if provided
    if (is_approved !== undefined) {
      updateData.is_approved = is_approved;
      updateData.approved_by_admin_id = req.user.id;
      updateData.approved_at = is_approved ? new Date() : null;
    }
    
    await existingLaboratory.update(updateData);
    laboratory = existingLaboratory;
  } else {
    // Admin creates new laboratory profile for user
    isFirstTimeCreation = true;
    const createData = {
      user_id: userId,
      lab_name,
      license_number,
      address
    };
    
    // Admin can set approval status directly
    if (is_approved !== undefined) {
      createData.is_approved = is_approved;
      createData.approved_by_admin_id = req.user.id;
      createData.approved_at = is_approved ? new Date() : null;
    } else {
      createData.is_approved = false; // Default to unapproved
    }
    
    laboratory = await Laboratory.create(createData);
    
    // Admin can also update user role if needed
    if (user.role === 'user') {
      await user.update({
        role: 'laboratory'
      });
      roleChanged = true;
    }
  }

  // Fetch complete profile
  const updatedLaboratory = await Laboratory.findOne({
    where: { id: laboratory.id },
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
    message: isFirstTimeCreation ? 'Laboratory profile created successfully by admin' : 'Laboratory profile updated successfully by admin',
    data: updatedLaboratory,
    adminAction: {
      performedBy: `${req.user.first_name} ${req.user.last_name}`,
      adminId: req.user.id
    }
  };
  
  if (roleChanged) {
    response.message += ' (role updated to laboratory)';
  }
  
  if (laboratory.is_approved) {
    response.note = 'Laboratory profile is approved and active';
  } else {
    response.note = 'Laboratory profile is pending approval';
  }

  res.status(200).json(response);
});