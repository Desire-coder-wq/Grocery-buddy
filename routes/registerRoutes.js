const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const User = require("../models/UserModel");
const { redirectIfAuthenticated } = require("../middleware/auth");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Created uploads directory:", uploadsDir);
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
  const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
  const extname = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif"];

  const isMimeTypeValid = allowedTypes.includes(file.mimetype);
  const isExtensionValid = allowedExtensions.includes(extname);

  if (isMimeTypeValid && isExtensionValid) {
    return cb(null, true);
  }

  cb(new Error("Only image files (JPEG, JPG, PNG, GIF) are allowed!"));
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter,
});

/* ------------------ VALIDATION HELPER ------------------ */
const validateRegistrationData = (data) => {
  const { username, email, password, confirmPassword } = data;
  const errors = {};

  // Username validation
  if (!username || username.trim() === "") {
    errors.username = "Username is required";
  } else if (username.length < 3) {
    errors.username = "Username must be at least 3 characters";
  } else if (username.length > 30) {
    errors.username = "Username cannot exceed 30 characters";
  } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.username =
      "Username can only contain letters, numbers, and underscores";
  }

  // Email validation
  if (!email || email.trim() === "") {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Please provide a valid email address";
  }

  // Password validation
  if (!password) {
    errors.password = "Password is required";
  } else if (password.length < 8) {
    errors.password = "Password must be at least 8 characters";
  } else if (!/[A-Z]/.test(password)) {
    errors.password = "Password must contain at least one uppercase letter";
  } else if (!/[a-z]/.test(password)) {
    errors.password = "Password must contain at least one lowercase letter";
  } else if (!/[0-9]/.test(password)) {
    errors.password = "Password must contain at least one number";
  }

  // Confirm password validation
  if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }

  return errors;
};

/* ------------------ REGISTER ROUTES ------------------ */

// GET: Register page
router.get("/register", redirectIfAuthenticated, (req, res) => {
  res.render("register", { title: "Register" });
});

// POST: Register new user
router.post("/register", upload.single("profileImage"), async (req, res) => {
  console.log("\n=== REGISTRATION ATTEMPT ===");
  console.log("Body:", req.body);
  console.log("File:", req.file ? req.file.filename : "No file uploaded");

  try {
    const { username, email, password, confirmPassword } = req.body;

    // Validate input data
    const validationErrors = validateRegistrationData(req.body);

    if (Object.keys(validationErrors).length > 0) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      console.log("❌ Validation failed:", validationErrors);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { username: username.trim() },
        { email: email.trim().toLowerCase() },
      ],
    });

    if (existingUser) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      const field =
        existingUser.email === email.trim().toLowerCase()
          ? "email"
          : "username";
      console.log(`❌ ${field} already exists:`, existingUser[field]);

      return res.status(400).json({
        success: false,
        message: `This ${field} is already registered`,
        errors: { [field]: `This ${field} is already taken` },
      });
    }

    // Hash password BEFORE saving
    console.log("🔐 Hashing password...");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log("Password hashed successfully");

    // Create new user
    const newUser = new User({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword, // Use the hashed password
      profileImage: req.file
        ? `/uploads/${req.file.filename}`
        : "/uploads/default-avatar.png",
    });

    console.log("Saving user to database...");
    const savedUser = await newUser.save();
    console.log("✅ User registered successfully:", {
      id: savedUser._id,
      username: savedUser.username,
      email: savedUser.email,
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully! Please login to continue.",
      redirectTo: "/auth/login",
    });
  } catch (error) {
    console.error("\n❌ REGISTRATION ERROR:", error);

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    if (error.name === "ValidationError") {
      const errors = {};
      Object.keys(error.errors).forEach((key) => {
        errors[key] = error.errors[key].message;
      });
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `This ${field} is already registered`,
        errors: { [field]: `This ${field} is already taken` },
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error during registration. Please try again.",
    });
  }
});

/* ------------------ LOGIN ROUTES ------------------ */

// GET: Login page
router.get("/login", redirectIfAuthenticated, (req, res) => {
  res.render("login", { title: "Login" });
});

// POST: Login user
router.post("/login", async (req, res) => {
  console.log("\n=== LOGIN ATTEMPT ===");
  console.log("Body:", req.body);

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      console.log("Missing email or password");
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
        field: !email ? "email" : "password",
      });
    }

    console.log("Looking for user with email:", email);
    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      console.log("❌ User not found:", email);
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
        field: "email",
      });
    }

    console.log("✅ User found:", user.email);

    // Compare passwords
    console.log("Comparing password...");
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      console.log("❌ Password does not match");
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
        field: "password",
      });
    }

    console.log("✅ Password matched");

    // Set session data
    req.session.userId = user._id;
    req.session.isAuthenticated = true;

    // Save the session
    req.session.save((err) => {
      if (err) {
        console.error("❌ Session save error:", err);
        return res.status(500).json({
          success: false,
          message: "Error saving session",
        });
      }

      console.log("✅ Login successful for user:", user.email);

      const userResponse = user.toObject();
      delete userResponse.password;

      return res.json({
        success: true,
        message: "Login successful",
        user: userResponse,
      });
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
});

// GET: Check authentication status
router.get("/check-auth", (req, res) => {
  if (req.session && req.session.isAuthenticated) {
    return res.json({
      authenticated: true,
      userId: req.session.userId,
    });
  }
  return res.json({
    authenticated: false,
  });
});

// GET: Logout
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).json({
        success: false,
        message: "Error logging out",
      });
    }

    res.clearCookie("connect.sid");
    res.redirect("/auth/login");
  });
});

module.exports = router;
