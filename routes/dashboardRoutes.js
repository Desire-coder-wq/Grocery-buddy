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
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error("Error rendering dashboard:", error);
    req.session.destroy();
    res.redirect("/auth/login");
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

    const formattedDate = user.createdAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const success = req.session.successMsg || null;
    const error = req.session.errorMsg || null;

    // Clear messages
    if (req.session) {
      delete req.session.successMsg;
      delete req.session.errorMsg;
    }

    res.render("profile", {
      title: "My Profile - Grocery Buddy",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage || "/uploads/default-avatar.png",
        createdAt: formattedDate,
      },
      success,
      error,
    });
  } catch (error) {
    console.error("Error rendering profile:", error);
    if (req.session) req.session.errorMsg = "Error loading profile";
    res.redirect("/dashboard");
  }
});

// --- Update Profile Route ---
router.post("/profile/update", requireAuth, async (req, res) => {
  try {
    const { username, email } = req.body;
    const user = await User.findById(req.session.userId);

    if (!user) {
      req.session.destroy();
      return res.redirect("/auth/login");
    }

    // Update info
    user.username = username || user.username;
    user.email = email || user.email;

    // Handle file upload if any
    if (req.file) {
      user.profileImage = "/uploads/" + req.file.filename;
    }

    await user.save();

    if (req.session) req.session.successMsg = "Profile updated successfully";
    res.redirect("/dashboard/profile");
  } catch (error) {
    console.error("Error updating profile:", error);
    if (req.session) req.session.errorMsg = "Error updating profile";
    res.redirect("/dashboard/profile");
  }
});

// --- Catch-All for Unmatched Dashboard Routes (fixed pattern) ---
router.all(/.*/, (req, res) => {
  console.log(`[DASHBOARD 404] Route not found: ${req.originalUrl}`);

  if (req.originalUrl.includes("login.html")) {
    console.log("Redirecting to /auth/login");
    return res.redirect("/auth/login");
  }

  res.status(404).send("Not Found");
});

module.exports = router;
