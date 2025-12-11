const jwt = require('jsonwebtoken');
require('dotenv').config();
const { models:{ User} } = require("../models");
const asyncHandler = require('express-async-handler');

/**
 * Main authentication middleware - verifies JWT token
 */
const authenticate = async (req, res, next) => {
    let token;
  
    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    } 
    // Check for token in cookies
    else if (req.cookies && req.cookies.jwt) {
        token = req.cookies.jwt;
    }
    // Check for token in query parameters (for emergency access)
    else if (req.query && req.query.access_token) {
        token = req.query.access_token;
    }
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Access denied. No token provided."
        });
    }

    console.log(token);

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET);
        console.log("Decoded token:", decoded);
        // Find user
        const user = await User.findByPk(decoded.userId);
        console.log("Authenticated user:", user);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: "Account is deactivated. Please contact administrator."
            });
        }

        // Attach user to request
        req.user = {
            id: user.id,
            userId: user.id, // For compatibility
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            is_verified: user.is_verified
        };

        // Update last login (optional)
        if (req.user.role === 'patient' || req.user.role === 'doctor') {
            await user.update({ last_login_at: new Date() });
        }

        next();

    } catch (err) {
        console.error('Authentication error:', err.message);
        
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: "Token expired. Please login again."
            });
        }
        
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: "Invalid token."
            });
        }

        return res.status(401).json({
            success: false,
            message: "Authentication failed."
        });
    }
};

/**
 * Role-based authorization middleware
 * @param {Array} allowedRoles - Array of roles that are allowed
 */
const authorize = (allowedRoles) => {
    const roles = allowedRoles
    allowedRoles = Array.isArray(roles) ? roles : [roles];    

    return (req, res, next) => {
        // Check if user is authenticated first
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }



        // Check if user's role is in the allowed roles array
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
            });
        }

        // For professionals (doctor, laboratory), check if they're approved
        if (['doctor', 'laboratory'].includes(req.user.role)) {
            // Note: You might want to add additional checks here
            // For example, check if doctor/lab is approved by admin
            // This would require fetching their profile
        }

        next();
    };
};

/**
 * Special middleware for emergency access
 */
const emergencyAccess = async (req, res, next) => {
    const { patient_id, emergency_code } = req.body;
    
    if (!patient_id || !emergency_code) {
        return res.status(400).json({
            success: false,
            message: "Patient ID and emergency code are required"
        });
    }

    try {
        // Find patient and check emergency access
        const { Patient } = require("../models");
        const patient = await Patient.findByPk(patient_id, {
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'first_name', 'last_name']
            }]
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }

        // Check if emergency access is enabled and code matches
        if (!patient.emergency_access_enabled || patient.emergency_access_code !== emergency_code) {
            return res.status(403).json({
                success: false,
                message: "Emergency access denied. Invalid code or access not enabled."
            });
        }

        // Create temporary user object for emergency access
        req.user = {
            id: `emergency_${Date.now()}`,
            userId: `emergency_${Date.now()}`,
            role: 'emergency',
            emergency_access: true,
            patient_id: patient.id,
            patient_name: `${patient.user.first_name} ${patient.user.last_name}`
        };

        // Set expiration for emergency access (e.g., 1 hour)
        req.emergency_expires = new Date(Date.now() + 3600000);

        next();

    } catch (error) {
        console.error('Emergency access error:', error);
        return res.status(500).json({
            success: false,
            message: "Emergency access failed"
        });
    }
};

/**
 * Optional: Middleware to check if user is verified (for sensitive operations)
 */
const requireVerification = (req, res, next) => {
    if (!req.user.is_verified && req.user.role !== 'patient') {
        return res.status(403).json({
            success: false,
            message: "Account verification required for this action"
        });
    }
    next();
};

/**
 * Optional: Middleware for temporary access tokens (for patient sharing)
 */
const temporaryAccess = async (req, res, next) => {
    const { access_token } = req.query;
    
    if (!access_token) {
        return res.status(400).json({
            success: false,
            message: "Access token required"
        });
    }

    try {
        const { TemporaryAccess, User } = require("../models");
        
        // Find temporary access record
        const tempAccess = await TemporaryAccess.findOne({
            where: {
                access_token,
                is_active: true,
                expires_at: { [Op.gt]: new Date() }
            },
            include: [
                {
                    model: User,
                    as: 'grantedTo',
                    attributes: ['id', 'first_name', 'last_name', 'email', 'role']
                }
            ]
        });

        if (!tempAccess) {
            return res.status(403).json({
                success: false,
                message: "Invalid or expired access token"
            });
        }

        // Create temporary user object
        req.user = {
            id: tempAccess.grantedTo.id,
            userId: tempAccess.grantedTo.id,
            email: tempAccess.grantedTo.email,
            first_name: tempAccess.grantedTo.first_name,
            last_name: tempAccess.grantedTo.last_name,
            role: tempAccess.grantedTo.role,
            temporary_access: true,
            access_level: tempAccess.access_level,
            expires_at: tempAccess.expires_at
        };

        // Track this access (optional)
        const { AccessLog } = require("../models");
        await AccessLog.create({
            patient_id: tempAccess.patient_id,
            accessed_by_id: tempAccess.granted_to_id,
            access_type: 'view',
            accessed_resource: req.originalUrl,
            is_temporary_access: true,
            temporary_access_expires_at: tempAccess.expires_at,
            access_granted_by_id: tempAccess.granted_by_id,
            reason_for_access: tempAccess.purpose
        });

        next();

    } catch (error) {
        console.error('Temporary access error:', error);
        return res.status(500).json({
            success: false,
            message: "Temporary access validation failed"
        });
    }
};


const checkLaboratoryApproval = asyncHandler(async (req, res, next) => {
  // This middleware should be added to laboratory routes that require approval
  if (req.user.role === 'laboratory') {
    const laboratory = await Laboratory.findOne({ where: { user_id: req.user.id } });
    
    if (!laboratory) {
      return res.status(403).json({
        success: false,
        message: 'Laboratory profile not found. Please complete your profile.'
      });
    }
    
    if (!laboratory.is_approved) {
      return res.status(403).json({
        success: false,
        message: 'Laboratory profile not approved. Please wait for admin approval.'
      });
    }
    
    // Attach laboratory info to request
    req.laboratory = laboratory;
  }
  
  next();
});


// For backward compatibility
const protect = authenticate;
const protectAdmin = [authenticate, authorize(['admin'])];
const protectEditor = [authenticate, authorize(['editor', 'admin'])];

module.exports = {
    authenticate,
    authorize,
    emergencyAccess,
    requireVerification,
    temporaryAccess,
    // For backward compatibility
    protect,
    protectAdmin,
    protectEditor
};