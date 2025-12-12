const asyncHandler = require('express-async-handler');
const { models: { Laboratory, User, LabTest } } = require('../../models');
const { Op } = require('sequelize');

// @desc    Get all laboratories
// @route   GET /api/admin/laboratories
// @access  Private/Admin
exports.getAllLaboratories = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, approved, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (approved !== undefined) {
        whereClause.is_approved = approved === 'true';
    }
    if (search) {
        whereClause[Op.or] = [
            { lab_name: { [Op.iLike]: `%${search}%` } },
            { license_number: { [Op.iLike]: `%${search}%` } },
            { address: { [Op.iLike]: `%${search}%` } }
        ];
    }

    const { count, rows: laboratories } = await Laboratory.findAndCountAll({
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
        data: laboratories,
        pagination: {
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit),
            limit: parseInt(limit)
        }
    });
});

// @desc    Get laboratory by ID
// @route   GET /api/admin/laboratories/:id
// @access  Private/Admin
exports.getLaboratoryById = asyncHandler(async (req, res) => {
    const laboratory = await Laboratory.findByPk(req.params.id, {
        include: [
            {
                model: User,
                as: 'user',
                attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'country', 'avatar']
            },
            {
                model: LabTest,
                as: 'tests',
                limit: 10,
                order: [['ordered_date', 'DESC']]
            }
        ]
    });

    if (!laboratory) {
        res.status(404);
        throw new Error('Laboratory not found');
    }

    res.json({
        success: true,
        data: laboratory
    });
});

// @desc    Approve laboratory
// @route   PUT /api/admin/laboratories/:id/approve
// @access  Private/Admin
exports.approveLaboratory = asyncHandler(async (req, res) => {
    const laboratory = await Laboratory.findByPk(req.params.id);
    
    if (!laboratory) {
        res.status(404);
        throw new Error('Laboratory not found');
    }

    if (laboratory.is_approved) {
        res.status(400);
        throw new Error('Laboratory is already approved');
    }

    await laboratory.update({
        is_approved: true,
        approved_by_admin_id: req.user.id,
        approved_at: new Date()
    });

    res.json({
        success: true,
        data: laboratory,
        message: 'Laboratory approved successfully'
    });
});

// @desc    Reject laboratory
// @route   PUT /api/admin/laboratories/:id/reject
// @access  Private/Admin
exports.rejectLaboratory = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const laboratory = await Laboratory.findByPk(req.params.id);
    
    if (!laboratory) {
        res.status(404);
        throw new Error('Laboratory not found');
    }

    await laboratory.update({
        is_approved: false,
        approved_by_admin_id: null,
        approved_at: null
    });

    // Here you would typically send a rejection email
    // await sendRejectionEmail(laboratory.user.email, reason);

    res.json({
        success: true,
        message: 'Laboratory rejected successfully'
    });
});

// @desc    Delete laboratory
// @route   DELETE /api/admin/laboratories/:id
// @access  Private/Admin
exports.deleteLaboratory = asyncHandler(async (req, res) => {
    const laboratory = await Laboratory.findByPk(req.params.id);
    
    if (!laboratory) {
        res.status(404);
        throw new Error('Laboratory not found');
    }

    await laboratory.destroy();
    
    res.json({
        success: true,
        message: 'Laboratory deleted successfully'
    });
});