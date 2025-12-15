const multer = require("multer");
const path = require('path');
const router = require("express").Router();
const { protect, protectAdmin } = require("../middlewares/authMiddleware");
const {
  getEmailCode, verifyEmailCode, register, auth, logout,
  getUser, getUsersProfile, updateUserProfile, deleteUser,
  postAvatar, getAvatar, deleteAvatar, adminCreateUser,
  AdminUpdateUser, EditRole, searchProfile
} = require("../controllers/usercontroller");

// Multer configuration
const DIR = "./public/profilePicture";
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  file.mimetype.split("/")[0] === "image" ? cb(null, true) : cb(new Error('Invalid file type'), false);
};

const upload = multer({ storage, fileFilter });

// Authentication routes
router.post("/jwt/auth", auth);
router.post("/jwt/logout", logout);
router.post("/jwt/register", register);

// Admin only routes
router.post("/jwt/admin/create", protectAdmin, adminCreateUser);
router.route("/jwt/role/:id").put(protectAdmin, EditRole);
router.route("/jwt/delete/:userId").delete(protectAdmin, deleteUser);


module.exports = router;