const asyncHandler = require('express-async-handler');
const { models: { Doctor, User, Prescription } } = require('../../models');
const { Op } = require('sequelize');

// @desc    Get all doctors
// @route   GET /api/admin/doctors
// @access  Private/Admin
exports.getAllDoctors = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, approved, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (approved !== undefined) {
        whereClause.is_approved = approved === 'true';
    }
    if (search) {
        whereClause[Op.or] = [
            { specialization: { [Op.iLike]: `%${search}%` } },
            { license_number: { [Op.iLike]: `%${search}%` } },
            { hospital_affiliation: { [Op.iLike]: `%${search}%` } }
        ];
    }

    const { count, rows: doctors } = await Doctor.findAndCountAll({
        where: whereClause,
        include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'is_active']
        }],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
    });

    res.json({
        success: true,
        data: doctors,
        pagination: {
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit),
            limit: parseInt(limit)
        }
    });
});

// @desc    Get doctor by ID
// @route   GET /api/admin/doctors/:id
// @access  Private/Admin
exports.getDoctorById = asyncHandler(async (req, res) => {
    const doctor = await Doctor.findByPk(req.params.id, {
        include: [
            {
                model: User,
                as: 'user',
                attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'country', 'avatar']
            },
            {
                model: Prescription,
                as: 'prescriptions',
                limit: 10,
                order: [['prescribed_date', 'DESC']]
            }
        ]
    });

    if (!doctor) {
        res.status(404);
        throw new Error('Doctor not found');
    }

    res.json({
        success: true,
        data: doctor
    });
});

// @desc    Approve doctor
// @route   PUT /api/admin/doctors/:id/approve
// @access  Private/Admin
exports.approveDoctor = asyncHandler(async (req, res) => {
    const doctor = await Doctor.findByPk(req.params.id);
    
    if (!doctor) {
        res.status(404);
        throw new Error('Doctor not found');
    }

    if (doctor.is_approved) {
        res.status(400);
        throw new Error('Doctor is already approved');
    }

    await doctor.update({
        is_approved: true,
        approved_by_admin_id: req.user.id,
        approved_at: new Date()
    });

    res.json({
        success: true,
        data: doctor,
        message: 'Doctor approved successfully'
    });
});

// @desc    Reject doctor
// @route   PUT /api/admin/doctors/:id/reject
// @access  Private/Admin
exports.rejectDoctor = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const doctor = await Doctor.findByPk(req.params.id);
    
    if (!doctor) {
        res.status(404);
        throw new Error('Doctor not found');
    }

    await doctor.update({
        is_approved: false,
        approved_by_admin_id: null,
        approved_at: null
    });

    // Here you would typically send a rejection email
    // await sendRejectionEmail(doctor.user.email, reason);

    res.json({
        success: true,
        message: 'Doctor rejected successfully'
    });
});

// @desc    Delete doctor
// @route   DELETE /api/admin/doctors/:id
// @access  Private/Admin
exports.deleteDoctor = asyncHandler(async (req, res) => {
    const doctor = await Doctor.findByPk(req.params.id);
    
    if (!doctor) {
        res.status(404);
        throw new Error('Doctor not found');
    }

    await doctor.destroy();
    
    res.json({
        success: true,
        message: 'Doctor deleted successfully'
    });
});