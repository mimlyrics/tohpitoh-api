const asyncHandler = require("express-async-handler");
const router = require("express").Router();
const { generateToken, generateAccessToken } = require("../utils/generate-token");
const fs = require("fs");

const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { generateCode, generateEmailToken } = require("../utils/utils");
const { models: { User } } = require("../models");
const { Op } = require('sequelize');

// SEND EMAIL VERIFICATION CODE
const getEmailCode = asyncHandler(async(req, res) => {
    const { email, password } = req.body;
    let rememberMe = req.body.rememberMe ?? false;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    // Check if email already exists
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
        return res.status(401).json({ message: "User already exists" });
    }

    // Email Transporter
    const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    // Generate Verification Token
    const token = generateEmailToken(email);

    await transporter.sendMail({
        to: email,
        subject: "Verify Your Account",
        html: `
            <p>Hello,</p>
            <p>Please verify your email by clicking the link below:</p>
            <a href="http://localhost:3000/verify/${token}">Verify Email</a>
        `
    });

    return res.status(201).json({ message: `Verification email sent to ${email}` });
});

const verifyEmailCode = asyncHandler(async(req, res) => {
    const { token } = req.params;

    try {
        const decoded = jwt.verify(token, process.env.EMAIL_TOKEN_SECRET);
        const email = decoded.email;

        // Check if email is already registered
        const exists = await User.findOne({ where: { email } });
        if (exists) {
            return res.status(400).json({ message: "Email already verified" });
        }

        // Create user with only email first
        const newUser = await User.create({ email });

        return res.status(200).json({
            user: newUser,
            message: "Email successfully verified"
        });

    } catch (err) {
        return res.status(400).json({ message: "Invalid or expired token" });
    }
});


const signWithEmail = asyncHandler(async(req, res) => {
    const { email, password } = req.userData;

    const user = await User.create({
        email,
        password
    });

    return res.status(201).json({ user });
});

const register = asyncHandler(async(req, res) => {
    const { first_name, last_name, email, phone, password, country } = req.body;

    // Validate duplicates
    const existing = await User.findOne({ where: { email } });
    if (existing) {
        return res.status(401).json({ message: "User already exists" });
    }

    const user = await User.create({
        first_name,
        last_name,
        email,
        phone,
        country,
        password
    });

    console.log(user);

    const refreshToken = generateToken(res, user.id, user.role);
    const accessToken = generateAccessToken(res, user.id, user.role);

    await user.update({ refreshToken: [...user.refreshToken, refreshToken] });

    return res.status(201).json({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        country: user.country,
        email: user.email,
        role: user.role,
        accessToken
    });
});

const adminCreateUser = asyncHandler(async(req, res) => {
    const { first_name, last_name, email, phone, password, country, role } = req.body;

    // Prevent admin from omitting required fields
    if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
    }

    // Check existing user
    const existing = await User.findOne({ where: { email } });
    if (existing) {
        return res.status(400).json({ message: "User already exists" });
    }

    // Create user
    const user = await User.create({
        first_name,
        last_name,
        email,
        phone,
        country,
        password,
        role: role || "user" // default role = user
    });

    return res.status(201).json({
        message: "User created successfully",
        user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            country: user.country
        }
    });
});

const auth = asyncHandler(async(req, res) => {
    const { email, password } = req.body;
    const cookies = req.cookies;

    console.log(req.body);
    const user = await User.findOne({ where: { email } });

    if (!user || !(await user.matchPassword(password))) {
        console.log('invalid password');
        return res.status(401).json({ message: "Invalid email or password" });
    }

    console.log(req.cookies);

    let newRefreshTokenArray = !cookies?.jwt ?
        user.refreshToken ? [user.refreshToken] : [] : [];

    if (cookies?.jwt) {
        const refreshToken = cookies.jwt;

        // if reuse detected, clear previous token
        if (user.refreshToken !== refreshToken) {
            newRefreshTokenArray = [];
        }

        res.clearCookie("jwt", {
            httpOnly: true,
            sameSite: "None",
            secure: true
        });
    }

    const newRefreshToken = generateToken(res, user.id, user.role);
    const newAccessToken = generateAccessToken(res, user.id, user.role);

    await user.update({ refreshToken: [newRefreshToken] });

    res.cookie("jwt", newRefreshToken, {
        httpOnly: true,
        sameSite: "None",
        secure: true,
        maxAge: 24 * 60 * 60 * 1000
    });

    return res.status(201).json({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        country: user.country,
        email: user.email,
        accessToken: newAccessToken
    });
});

const logout = asyncHandler(async(req, res) => {
    let token;

    if (req.headers?.authorization.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }
    console.log(token);

    if (!token) {
        return res.status(204).json({ message: "No token provided" });
    }

    let user;

    if (req.cookies?.jwt) {
        user = await User.findOne({
            where: {
                refreshToken: {
                    [Op.contains]: [token]
                }
            }
        });
    } else {
        try {
            const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
            user = await User.findByPk(decoded.userId);
        } catch (err) {
            return res.status(401).json({ message: "Invalid token" });
        }
    }

    if (user) {
        const newRefreshTokens = user.refreshToken.filter(rt => rt !== token);
        await user.update({ refreshToken: newRefreshTokens });
    }

    if (req.cookies?.jwt) {
        res.clearCookie("jwt", {
            httpOnly: true,
            sameSite: "None",
            secure: true,
        });
    }

    return res.status(200).json({ message: "User logged out successfully" });
});

const getUser = asyncHandler(async(req, res) => {
    const { userId } = req.params;

    const user = await User.findByPk(userId);

    if (!user) {
        return res.status(404).json({ message: "No user with that ID" });
    }

    return res.status(200).json({ user });
});


const getUserByPhone = asyncHandler(async(req, res) => {
    const { phone } = req.params;

    const user = await User.findOne({ where: { phone } });

    if (!user) {
        return res.status(404).json({ message: "No user with that phone number" });
    }

    return res.status(200).json({ user });
});


const getUsersProfile = asyncHandler(async(req, res) => {
    const users = await User.findAll();

    if (!users || users.length === 0) {
        return res.status(404).json({ message: "No users found" });
    }

    return res.status(200).json({ users });
});

const EditRole = asyncHandler(async(req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    const user = await User.findByPk(id);

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    await user.update({ role: role || user.role });

    return res.status(200).json({ user });
});


const updateUserProfile = asyncHandler(async(req, res) => {
    const userId = req.user.id;

    const user = await User.findByPk(userId);

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    const { first_name, last_name } = req.body;

    await user.update({
        firstName: first_name || user.firstName,
        lastName: last_name || user.lastName
    });

    return res.status(200).json({
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        country: user.country,
        role: user.role,
    });
});


const AdminUpdateUser = asyncHandler(async(req, res) => {
    const { userId, hisId } = req.params;
    const { first_name, last_name, email, password, country } = req.body;

    const admin = await User.findByPk(userId);
    if (!admin || !admin.role || admin.role.isAdmin !== true) {
        return res.status(403).json({ message: "Permission denied" });
    }

    const user = await User.findByPk(hisId);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    let avatarUrl = user.avatar;

    if (req.file) {
        avatarUrl = `${req.protocol}://${req.get("host")}/public/profilePicture/${req.file.filename}`;

        if (user.avatar) {
            const existing = "." + user.avatar.split(":5000")[1];
            if (fs.existsSync(existing)) {
                fs.unlink(existing, (err) => {
                    if (err) console.log("Avatar deletion error:", err);
                });
            }
        }
    }

    await user.update({
        firstName: first_name || user.first_name,
        lastName: last_name || user.last_name,
        email: email || user.email,
        password: password || user.password,
        avatar: avatarUrl,
        country: country || user.country
    });

    return res.status(200).json({ message: "User updated", user });
});


const searchProfile = asyncHandler(async(req, res) => {
    const { searchId } = req.params;

    const users = await User.findAll({
        where: {
            [Op.or]: [
                { firstName: searchId },
                { lastName: searchId },
                { email: searchId },
                { phone: searchId }
            ]
        }
    });

    if (!users || users.length === 0) {
        return res.status(404).json({ message: "No users match this search" });
    }

    return res.status(200).json({ users });
});


const deleteUser = asyncHandler(async(req, res) => {
    const { userId } = req.params;

    const user = await User.findByPk(userId);

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    if (user.avatar) {
        const avatarPath = "." + user.avatar.split(":5000")[1];
        if (fs.existsSync(avatarPath)) {
            fs.unlink(avatarPath, (err) => {
                if (err) console.log("Error deleting avatar:", err);
            });
        }
    }

    await user.destroy();

    return res.status(200).json({ message: "User deleted successfully" });
});


const postAvatar = asyncHandler(async(req, res) => {
    const { userId } = req.params;

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
    }

    const newAvatar = `${req.protocol}://${req.get("host")}/public/profilePicture/${req.file.filename}`;

    // Delete old avatar if exists
    if (user.avatar) {
        const oldPath = "." + user.avatar.split(":5000")[1];
        if (fs.existsSync(oldPath)) {
            fs.unlink(oldPath, err => {
                if (err) console.log("Error deleting old avatar:", err);
            });
        }
    }

    await user.update({ avatar: newAvatar });

    return res.status(201).json({
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        avatar: newAvatar,
        country: country
    });
});

const deleteAvatar = asyncHandler(async(req, res) => {
    const { userId } = req.body;

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.avatar) {
        const avatarPath = "." + user.avatar.split(":5000")[1];

        if (fs.existsSync(avatarPath)) {
            fs.unlinkSync(avatarPath);
        }

        await user.update({ avatar: "" });
    }

    return res.status(201).json({ message: "Avatar deleted successfully" });
});


const getAvatar = asyncHandler(async(req, res) => {
    const { userId } = req.params;

    const user = await User.findByPk(userId);
    if (!user || !user.avatar) {
        return res.status(404).json({ message: "No avatar found" });
    }

    const path = "." + user.avatar.split(":5000")[1];

    if (!fs.existsSync(path)) {
        return res.status(404).json({ message: "Avatar file missing" });
    }

    return res.status(200).json({ avatar: user.avatar });
});





module.exports = {
    signWithEmail,
    getEmailCode,
    verifyEmailCode,
    register,
    auth,
    logout,
    getUsersProfile,
    deleteUser,
    getUsersProfile,
    updateUserProfile,
    postAvatar,
    deleteAvatar,
    getAvatar,
    getUser,
    AdminUpdateUser,
    searchProfile,
    getUserByPhone,
    EditRole,
    adminCreateUser
};