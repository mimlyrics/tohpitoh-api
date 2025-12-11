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
router.post("/jwt/verifyEmailCode", getEmailCode);
router.post("/jwt/verifyEmailCode/:token", verifyEmailCode);

// Admin only routes
router.post("/jwt/admin/create", protectAdmin, adminCreateUser);
router.route("/jwt/role/:id").put(protectAdmin, EditRole);
router.route("/jwt/delete/:userId").delete(protectAdmin, deleteUser);

// Profile routes
router.route("/jwt/profile")
  .get(protectAdmin, getUsersProfile)
  .put(protect, updateUserProfile);

router.route("/jwt/profile/:userId")
  .get(protectAdmin, getUser)
  .put(protectAdmin, upload.single("avatar"), AdminUpdateUser);

router.get("/jwt/profile/search/:searchId", protectAdmin, searchProfile);

// Avatar routes
router.route("/upload/avatar/:userId")
  .put(upload.single("avatar"), postAvatar)
  .get(getAvatar)
  .delete(deleteAvatar);

// Protection test routes (if needed for development)
router.get("/jwt/protectAdmin", protectAdmin);

module.exports = router;