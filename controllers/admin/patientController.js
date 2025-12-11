

const asyncHandler = require('express-async-handler');
const {models: {Patient, User, MedicalRecord, Prescription, LabTest}} = require('../../models');
const { use } = require('passport');

// Admin update patient profile for any user
exports.updatePatientProfileByAdmin = asyncHandler(async (req, res) => {
  console.log("\nAdmin updating patient profile");
  console.log("Admin user:", req.user);
  console.log("Request body:", req.body);
  
  const {date_of_birth, height, weight, gender, blood_group, genotype,
         known_allergies, known_diseases, emergency_access_enabled, emergency_access_code} = req.body;
  
  const {userId} = req.params;
  console.log("Target user ID:", userId);
  console.log("Admin user ID:", req.user.id);
  
  // Check if target user exists
  const user = await User.findByPk(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Target user not found'
    });
  }
  
  // Check if patient profile already exists
  let existingPatient = await Patient.findOne({where: {user_id: userId}});
  
  let isFirstTimeCreation = false;
  let patient;
  let roleChanged = false;
  
  if (existingPatient) {
    // Admin updates existing patient profile
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
    // Admin creates new patient profile for user
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
    
    // Admin can also update user role if needed
    if (user.role === 'user') {
      await user.update({
        role: 'patient'
      });
      roleChanged = true;
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
    message: isFirstTimeCreation ? 'Patient profile created successfully by admin' : 'Patient profile updated successfully by admin',
    data: updatedPatient,
    adminAction: {
      performedBy: `${req.user.first_name} ${req.user.last_name}`,
      adminId: req.user.id
    }
  };
  
  if (roleChanged) {
    response.message += ' (role updated to patient)';
  }

  res.status(200).json(response);
});

