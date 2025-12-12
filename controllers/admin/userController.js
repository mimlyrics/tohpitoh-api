const asyncHandler = require('express-async-handler');
const { models: { User, Doctor, Patient, Laboratory } } = require('../../models');
const { Op } = require('sequelize');

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
exports.getDashboardStats = asyncHandler(async (req, res) => {
    const [
        totalUsers,
        totalPatients,
        totalDoctors,
        totalLaboratories,
        pendingDoctors,
        pendingLaboratories,
        activeUsers
    ] = await Promise.all([
        User.count(),
        Patient.count(),
        Doctor.count({ where: { is_approved: true } }),
        Laboratory.count({ where: { is_approved: true } }),
        Doctor.count({ where: { is_approved: false } }),
        Laboratory.count({ where: { is_approved: false } }),
        User.count({ where: { is_active: true } })
    ]);

    const recentUsers = await User.findAll({
        order: [['createdAt', 'DESC']],
        limit: 10,
        attributes: ['id', 'first_name', 'last_name', 'email', 'role', 'createdAt']
    });

    res.json({
        success: true,
        data: {
            totalUsers,
            totalPatients,
            totalDoctors,
            totalLaboratories,
            pendingDoctors,
            pendingLaboratories,
            activeUsers,
            recentUsers
        }
    });
});


// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, role, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (role) whereClause.role = role;
    if (search) {
        whereClause[Op.or] = [
            { first_name: { [Op.iLike]: `%${search}%` } },
            { last_name: { [Op.iLike]: `%${search}%` } },
            { email: { [Op.iLike]: `%${search}%` } }
        ];
    }

    const { count, rows: users } = await User.findAndCountAll({
        where: whereClause,
        attributes: { exclude: ['password', 'refreshToken'] },
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
    });

    res.json({
        success: true,
        data: users,
        pagination: {
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit),
            limit: parseInt(limit)
        }
    });
});

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUserById = asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.id, {
        attributes: { exclude: ['password', 'refreshToken'] },
        include: [
            {
                association: 'patientProfile',
                required: false
            },
            {
                association: 'doctorProfile',
                required: false
            },
            {
                association: 'laboratoryProfile',
                required: false
            }
        ]
    });

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    res.json({
        success: true,
        data: user
    });
});

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
exports.updateUser = asyncHandler(async (req, res) => {
    const { first_name, last_name, email, phone, country, is_active, role } = req.body;
    const userId = req.params.id;

    const user = await User.findByPk(userId);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Don't allow updating email if it already exists for another user
    if (email && email !== user.email) {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser && existingUser.id !== userId) {
            res.status(400);
            throw new Error('Email already in use');
        }
    }

    const updatedUser = await user.update({
        first_name: first_name || user.first_name,
        last_name: last_name || user.last_name,
        email: email || user.email,
        phone: phone || user.phone,
        country: country || user.country,
        is_active: is_active !== undefined ? is_active : user.is_active,
        role: role || user.role
    });

    res.json({
        success: true,
        data: {
            id: updatedUser.id,
            first_name: updatedUser.first_name,
            last_name: updatedUser.last_name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            role: updatedUser.role,
            is_active: updatedUser.is_active,
            createdAt: updatedUser.createdAt
        },
        message: 'User updated successfully'
    });
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Check if user has associated profiles
    const hasProfiles = await Promise.all([
        Patient.findOne({ where: { user_id: user.id } }),
        Doctor.findOne({ where: { user_id: user.id } }),
        Laboratory.findOne({ where: { user_id: user.id } })
    ]);

    const hasAnyProfile = hasProfiles.some(profile => profile !== null);
    
    if (hasAnyProfile) {
        res.status(400);
        throw new Error('Cannot delete user with associated profiles. Delete profiles first.');
    }

    await user.destroy();
    
    res.json({
        success: true,
        message: 'User deleted successfully'
    });
});