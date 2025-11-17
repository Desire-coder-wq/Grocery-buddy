const express = require("express");
const router = express.Router();
const mongoose = require("mongoose"); // ADD THIS LINE
const User = require("../models/UserModel");
const Item = require("../models/ItemModel");
const { requireAuth } = require("../middleware/auth");

// Get user profile with statistics
router.get("/", requireAuth, async (req, res) => {
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

    // Get item statistics
    const [totalItems, completedItems, recentItems, categoryStats] =
      await Promise.all([
        // Total items count
        Item.countDocuments({ user: req.session.userId }),

        // Completed items count
        Item.countDocuments({
          user: req.session.userId,
          completed: true,
        }),

        // Recent items
        Item.find({ user: req.session.userId })
          .sort({ createdAt: -1 })
          .limit(5)
          .select("name category completed createdAt price")
          .lean(),

        // Category statistics
        Item.aggregate([
          { $match: { user: new mongoose.Types.ObjectId(req.session.userId) } }, // FIXED
          {
            $group: {
              _id: "$category",
              count: { $sum: 1 },
              totalPrice: { $sum: "$price" },
              completed: {
                $sum: {
                  $cond: [{ $eq: ["$completed", true] }, 1, 0],
                },
              },
            },
          },
          { $sort: { count: -1 } },
        ]),
      ]);

    // Calculate member since and join date
    const memberSince = user.createdAt.getFullYear();
    const joinDate = user.createdAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Calculate completion rate
    const completionRate =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    // Calculate total spent
    const totalSpent = categoryStats.reduce(
      (sum, cat) => sum + (cat.totalPrice || 0),
      0
    );

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
        pendingItems: totalItems - completedItems,
        completionRate,
        memberSince,
        joinDate,
        totalSpent: totalSpent.toFixed(2),
        categories: categoryStats,
        topCategory: categoryStats[0]?._id || "None",
      },
      recentItems,
    });
  } catch (error) {
    console.error("Error in profile route:", error);
    res.status(500).render("error", {
      message: "Error loading profile",
      error: process.env.NODE_ENV === "development" ? error : {},
    });
  }
});

// Update profile information
router.post("/update", requireAuth, async (req, res) => {
  try {
    const { fullName, email } = req.body;
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update user information
    if (fullName) user.username = fullName;
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
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get detailed statistics
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [categoryStats, recentActivity, monthlySpending] = await Promise.all([
      // Category statistics
      Item.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(req.session.userId) } }, // FIXED
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
            totalPrice: { $sum: "$price" },
            completed: {
              $sum: { $cond: [{ $eq: ["$completed", true] }, 1, 0] },
            },
          },
        },
        { $sort: { count: -1 } },
      ]),

      // Recent activity
      Item.find({ user: req.session.userId })
        .sort({ updatedAt: -1 })
        .limit(10)
        .select("name category completed updatedAt price")
        .lean(),

      // Monthly spending
      Item.aggregate([
        {
          $match: {
            user: new mongoose.Types.ObjectId(req.session.userId), // FIXED
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            total: { $sum: "$price" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({
      success: true,
      stats: {
        categoryStats,
        recentActivity,
        monthlySpending,
      },
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

module.exports = router;
