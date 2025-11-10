const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const User = require("../models/UserModel");

// --- Debug Middleware (logs every dashboard request) ---
router.use((req, res, next) => {
  console.log(`[DASHBOARD] ${req.method} ${req.originalUrl}`);
  next();
});

// --- Redirect legacy dashboard login page to /auth/login ---
router.get("/login.html", (req, res) => {
  console.log("Redirecting /dashboard/login.html to /auth/login");
  return res.redirect("/auth/login");
});

// --- Test Route (no auth needed) ---
router.get("/test", (req, res) => {
  console.log("Test route hit!");
  res.send("Test route is working!");
});

// --- Dashboard Home (requires authentication) ---
router.get("/", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select("-password");

    if (!user) {
      req.session.destroy();
      return res.redirect("/auth/login");
    }

    res.render("dashboard", {
      title: "Dashboard - Grocery Buddy",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage || "/uploads/default-avatar.png",
        status: user.status || "Hey there! I am using Grocery Buddy!",
      },
    });
  } catch (error) {
    console.error("Error rendering dashboard:", error);
    req.session.destroy();
    res.redirect("/auth/login");
  }
});

// --- Update Status (requires authentication) ---
router.post("/update-status", requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || status.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Status cannot be empty" });
    }

    const user = await User.findByIdAndUpdate(
      req.session.userId,
      { status: status.trim() },
      { new: true }
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ success: true, status: user.status });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// --- Profile Page (requires authentication) ---
router.get("/profile", requireAuth, async (req, res) => {
  console.log("\n=== PROFILE ROUTE HIT ===");
  console.log("Session ID:", req.sessionID);
  console.log("User ID from session:", req.session.userId);

  // Prevent caching
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");

  try {
    const user = await User.findById(req.session.userId).select("-password");
    if (!user) {
      console.log("No user found. Destroying session.");
      req.session.destroy();
      return res.redirect("/auth/login");
    }

    // Calculate statistics (you can add more complex logic here)
    const totalItems = 0; // TODO: Add logic to count user's items from database
    const completedItems = 0; // TODO: Add logic to count completed items
    const memberSince = user.createdAt.getFullYear();

    res.render("profile", {
      title: "My Profile - ShopSmart",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage || "/uploads/default-avatar.png",
      },
      stats: {
        totalItems,
        completedItems,
        memberSince,
      },
    });
  } catch (error) {
    console.error("Error rendering profile:", error);
    res.redirect("/dashboard");
  }
});

// --- Update Profile Route ---
router.post("/profile/update", requireAuth, async (req, res) => {
  try {
    const { fullName, username, email } = req.body;
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update user information
    if (fullName) user.username = fullName;
    if (username) user.username = username;
    if (email) user.email = email;

    // Handle profile image upload if provided
    if (req.file) {
      user.profileImage = "/uploads/" + req.file.filename;
    }

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      success: false,
      message: "Error updating profile",
    });
  }
});

// --- Change Password Route ---
router.post("/profile/password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify current password (assuming you have a comparePassword method)
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Validate new password
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    // Update password (assuming your User model has password hashing)
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({
      success: false,
      message: "Error changing password",
    });
  }
});

// --- Delete Account Route ---
router.delete("/profile/delete", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Delete user account
    await User.findByIdAndDelete(req.session.userId);

    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
      }
    });

    res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting account",
    });
  }
});

// --- Catch-All for Unmatched Dashboard Routes ---
router.all(/.*/, (req, res) => {
  console.log(`[DASHBOARD 404] Route not found: ${req.originalUrl}`);

  if (req.originalUrl.includes("login.html")) {
    console.log("Redirecting to /auth/login");
    return res.redirect("/auth/login");
  }

  res.status(404).send("Not Found");
});

module.exports = router;
