const asyncHandler = require('express-async-handler');
const { models: { Patient, User, MedicalRecord, Prescription } } = require('../../models');
const { Op } = require('sequelize');

// @desc    Get all patients
// @route   GET /api/admin/patients
// @access  Private/Admin
exports.getAllPatients = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (search) {
        whereClause[Op.or] = [
            { gender: { [Op.iLike]: `%${search}%` } },
            { blood_type: { [Op.iLike]: `%${search}%` } }
        ];
    }

    const { count, rows: patients } = await Patient.findAndCountAll({
        where: whereClause,
        include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
        }],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
    });

    res.json({
        success: true,
        data: patients,
        pagination: {
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit),
            limit: parseInt(limit)
        }
    });
});

// @desc    Get patient by ID
// @route   GET /api/admin/patients/:id
// @access  Private/Admin
exports.getPatientById = asyncHandler(async (req, res) => {
    const patient = await Patient.findByPk(req.params.id, {
        include: [
            {
                model: User,
                as: 'user',
                attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'country', 'avatar']
            },
            {
                model: MedicalRecord,
                as: 'medicalRecords',
                limit: 10,
                order: [['date', 'DESC']]
            },
            {
                model: Prescription,
                as: 'prescriptions',
                limit: 10,
                order: [['prescribed_date', 'DESC']]
            }
        ]
    });

    if (!patient) {
        res.status(404);
        throw new Error('Patient not found');
    }

    res.json({
        success: true,
        data: patient
    });
});

// @desc    Update patient
// @route   PUT /api/admin/patients/:id
// @access  Private/Admin
exports.updatePatient = asyncHandler(async (req, res) => {
    const patient = await Patient.findByPk(req.params.id);
    
    if (!patient) {
        res.status(404);
        throw new Error('Patient not found');
    }

    const updateData = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.user_id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    await patient.update(updateData);

    res.json({
        success: true,
        data: patient,
        message: 'Patient updated successfully'
    });
});

// @desc    Delete patient
// @route   DELETE /api/admin/patients/:id
// @access  Private/Admin
exports.deletePatient = asyncHandler(async (req, res) => {
    const patient = await Patient.findByPk(req.params.id);
    
    if (!patient) {
        res.status(404);
        throw new Error('Patient not found');
    }

    await patient.destroy();
    
    res.json({
        success: true,
        message: 'Patient deleted successfully'
    });
});