const express = require("express");
const router = express.Router();
const User = require("../models/UserModel"); // ← ADD THIS LINE!
const profileRoutes = require("./profileRoutes");
const { requireAuth } = require("../middleware/auth");

// --- Debug Middleware (logs every dashboard request) ---
router.use((req, res, next) => {
  console.log(`[DASHBOARD] ${req.method} ${req.originalUrl}`);
  next();
});

// --- Redirect legacy dashboard login page to /auth/login ---
router.get("/login", (req, res) => {
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
  console.log("dashboard error");
  console.log("log  request ", req);
  console.log("log response", res);
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

// Use profile routes
router.use("/profile", profileRoutes);

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

router.get("/", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select("-password");

    if (!user) {
      req.session.destroy();
      return res.redirect("/auth/login");
    }

    const today = new Date();
    const options = {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    const currentDate = today.toLocaleDateString("en-US", options);

    res.render("dashboard", {
      title: "Dashboard - Grocery Buddy",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage || "/uploads/default-avatar.png",
        status: user.status || "Hey there! I am using Grocery Buddy!",
      },
      currentDate, 
    });
  } catch (error) {
    console.error("Error rendering dashboard:", error);
    req.session.destroy();
    res.redirect("/auth/login");
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
