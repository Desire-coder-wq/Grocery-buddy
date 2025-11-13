const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { registerUser } = require("../controllers/userController");
const { redirectIfAuthenticated } = require("../middleware/auth");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/* ------------------ MULTER SETUP ------------------ */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "profile-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  const extname = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
  
  const isMimeTypeValid = allowedTypes.includes(file.mimetype);
  const isExtensionValid = allowedExtensions.includes(extname);
  
  if (isMimeTypeValid && isExtensionValid) {
    return cb(null, true);
  }
  
  cb(new Error('Only image files (JPEG, JPG, PNG, GIF) are allowed!'));
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter,
});

/* ------------------ AUTH/REGISTER ROUTES ------------------ */

// GET: Register page (/auth/register)
router.get("/register", redirectIfAuthenticated, (req, res) => {
  console.log("=== Register page accessed at /auth/register ===");
  res.render("register", { title: "Register - Grocery Buddy" });
});

// POST: Register new user (/auth/register)
router.post("/register", upload.single("profileImage"), registerUser);

module.exports = router;