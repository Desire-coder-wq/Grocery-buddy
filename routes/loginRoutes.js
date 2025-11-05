const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/UserModel");
const { redirectIfAuthenticated } = require("../middleware/auth");


const validateLoginData = (data) => {
  const { email, password } = data;
  const errors = {};

  
  if (!email || email.trim() === "") {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Please provide a valid email address";
  }

  
  if (!password || password.trim() === "") {
    errors.password = "Password is required";
  }

  return errors;
};


router.get("/login", redirectIfAuthenticated, (req, res) => {
  res.render("login", { title: "Login" });
});

router.post("/login", async (req, res) => {
  console.log("\n=== LOGIN ATTEMPT ===");
  console.log("Email:", req.body.email);
  console.log("Timestamp:", new Date().toISOString());

  try {
    const { email, password, rememberMe } = req.body;

    const validationErrors = validateLoginData(req.body);
    if (Object.keys(validationErrors).length > 0) {
      console.log("❌ Validation failed:", validationErrors);
      return res.status(400).json({
        success: false,
        message: "Please provide valid credentials",
        errors: validationErrors,
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user) {
      console.log("❌ User not found:", email.trim().toLowerCase());
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        field: "email",
      });
    }

    console.log(" User found:", user.email);
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log(" Invalid password for user:", user.email);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        field: "password",
      });
    }

    console.log(" Password validated successfully");

    // Create session
    req.session.userId = user._id;
    req.session.username = user.username;
    req.session.email = user.email;
    req.session.profileImage = user.profileImage;
    req.session.isAuthenticated = true;

    // Handle "Remember Me" functionality
    if (rememberMe) {
      // Session will last 30 days
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
    } else {
      // Session will last until browser closes
      req.session.cookie.expires = false;
    }

    req.session.save((err) => {
      if (err) {
        console.error(" Session save error:", err);
        return res.status(500).json({
          success: false,
          message: "Error creating session. Please try again.",
        });
      }

      console.log(" Session created successfully");
      console.log("Session ID:", req.sessionID);
      console.log("User ID:", req.session.userId);

      return res.status(200).json({
        success: true,
        message: "Login successful! Welcome back.",
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          profileImage: user.profileImage,
        },
        redirectTo: "/dashboard",
      });
    });
  } catch (error) {
    console.error("\n LOGIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during login. Please try again.",
    });
  }
});

// TEMPORARY: Password reset route - REMOVE after use
router.post("/reset-password-temp", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update user's password
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { password: hashedPassword },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    console.log("✅ Password reset successfully for:", user.email);
    console.log("New password hash:", hashedPassword);
    
    return res.json({
      success: true,
      message: `Password reset successfully for ${user.email}`,
      newPassword: newPassword
    });
  } catch (error) {
    console.error("❌ Reset error:", error);
    return res.status(500).json({
      success: false,
      message: "Error resetting password"
    });
  }
});

// ADD THIS TEMPORARILY - Remove after fixing
router.post("/emergency-reset", async (req, res) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("Password123", salt);
    
    const user = await User.findOneAndUpdate(
      { email: "grace@gmail.com" },
      { password: hashedPassword },
      { new: true }
    );
    
    console.log("✅ Password reset to 'Password123'");
    console.log("New hash:", hashedPassword);
    
    return res.json({ 
      success: true, 
      message: "Password reset successfully" 
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});


router.post("/logout", (req, res) => {
  console.log("\n=== LOGOUT ATTEMPT ===");
  console.log("User ID:", req.session?.userId);

  if (!req.session.userId) {
    return res.status(400).json({
      success: false,
      message: "No active session found",
    });
  }

  req.session.destroy((err) => {
    if (err) {
      console.error(" Logout error:", err);
      return res.status(500).json({
        success: false,
        message: "Error logging out. Please try again.",
      });
    }

    res.clearCookie("connect.sid");
    console.log("Logout successful");

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
      redirectTo: "/auth/login",
    });
  });
});


router.get("/check-auth", (req, res) => {
  if (req.session && req.session.isAuthenticated) {
    return res.status(200).json({
      isAuthenticated: true,
      user: {
        id: req.session.userId,
        username: req.session.username,
        email: req.session.email,
        profileImage: req.session.profileImage,
      },
    });
  }

  return res.status(200).json({
    isAuthenticated: false,
  });
});

module.exports = router;
