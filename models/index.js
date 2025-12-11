const sequelize = require("../sequelize");
const UserModel = require("./User");
const PatientModel = require("./Patient");
const LabTestModel = require("./LabTest");
const PrescriptionModel = require("./Prescription");
const MedicalRecordModel = require("./MedicalRecord");
const AppointmentModel = require("./Appointment");
const AccessPermissionModel = require("./AccessPermission");
const DoctorModel = require("./Doctor");
const LaboratoryModel = require('./Laboratory');
const models = {};

models.User = UserModel(sequelize);
models.Patient = PatientModel(sequelize);
models.LabTest = LabTestModel(sequelize);
models.Prescription = PrescriptionModel(sequelize);
models.MedicalRecord = MedicalRecordModel(sequelize);
models.Appointment = AppointmentModel(sequelize);
models.Laboratory = LaboratoryModel(sequelize);
models.AccessPermission = AccessPermissionModel(sequelize);
models.Doctor = DoctorModel(sequelize);

// USER RELATIONSHIPS
models.User.hasOne(models.Patient, { foreignKey: 'user_id', as: 'patientProfile' });
models.User.hasOne(models.Doctor, { foreignKey: 'user_id', as: 'doctorProfile' });
models.User.hasOne(models.Laboratory, { foreignKey: 'user_id', as: 'laboratoryProfile' });

models.Patient.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
models.Doctor.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
models.Laboratory.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });

// DOCTOR/LAB APPROVAL
models.Doctor.belongsTo(models.User, { foreignKey: 'approved_by_admin_id', as: 'approvedByAdmin' });
models.Laboratory.belongsTo(models.User, { foreignKey: 'approved_by_admin_id', as: 'approvedByAdmin' });

// PATIENT MEDICAL DATA
models.Patient.hasMany(models.MedicalRecord, { foreignKey: 'patient_id', as: 'medicalRecords' });
models.MedicalRecord.belongsTo(models.Patient, { foreignKey: 'patient_id', as: 'patient' });

// DOCTOR PRESCRIPTIONS AND RECORDS
models.Doctor.hasMany(models.Prescription, { foreignKey: 'doctor_id', as: 'prescriptions' });
models.Doctor.hasMany(models.MedicalRecord, { foreignKey: 'doctor_id', as: 'clinicalNotes' });
models.Doctor.hasMany(models.LabTest, { foreignKey: 'doctor_id', as: 'orderedTests' });

// PRESCRIPTION ASSOCIATIONS 
models.Prescription.belongsTo(models.Doctor, { foreignKey: 'doctor_id', as: 'doctor' });
models.Prescription.belongsTo(models.Patient, { foreignKey: 'patient_id', as: 'patient' });

// PATIENT HAS PRESCRIPTIONS TOO
models.Patient.hasMany(models.Prescription, { foreignKey: 'patient_id', as: 'prescriptions' });

// LABORATORY TESTS
models.Laboratory.hasMany(models.LabTest, { foreignKey: 'laboratory_id', as: 'tests' });
models.LabTest.belongsTo(models.Laboratory, { foreignKey: 'laboratory_id', as: 'laboratory' });
models.LabTest.belongsTo(models.Patient, { foreignKey: 'patient_id', as: 'patient' });
models.LabTest.belongsTo(models.Doctor, { foreignKey: 'doctor_id', as: 'doctor' });

// ACCESS PERMISSIONS
models.Patient.hasMany(models.AccessPermission, { foreignKey: 'patient_id', as: 'accessPermissions' });
models.AccessPermission.belongsTo(models.Patient, { foreignKey: 'patient_id', as: 'patient' });
models.AccessPermission.belongsTo(models.User, { foreignKey: 'granted_to_id', as: 'grantedTo' });
models.AccessPermission.belongsTo(models.User, { foreignKey: 'granted_by_id', as: 'grantedBy' });

// MEDICAL RECORD ASSOCIATIONS
models.MedicalRecord.belongsTo(models.Doctor, { foreignKey: 'doctor_id', as: 'doctor' });
models.MedicalRecord.belongsTo(models.Laboratory, { foreignKey: 'laboratory_id', as: 'laboratory' });

module.exports = { sequelize, models };