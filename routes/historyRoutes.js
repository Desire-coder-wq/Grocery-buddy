const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const History = require("../models/HistoryModel");
const Item = require("../models/ItemModel");
const User = require("../models/UserModel");

// --- Debug Middleware ---
router.use((req, res, next) => {
  console.log(`[HISTORY] ${req.method} ${req.originalUrl}`);
  next();
});

// --- Render History Page ---
router.get("/", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select("-password");
    
    if (!user) {
      req.session.destroy();
      return res.redirect("/auth/login");
    }
    
    res.render("history", {
      title: "Shopping History - Grocery Buddy",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage || "/uploads/default-avatar.png",
      },
    });
  } catch (error) {
    console.error("Error rendering history page:", error);
    res.redirect("/dashboard");
  }
});

// --- Get User's History (API) ---
router.get("/api", requireAuth, async (req, res) => {
  try {
    const history = await History.find({ userId: req.session.userId })
      .sort({ clearedAt: -1 }) // Newest first
      .lean();

    res.json({
      success: true,
      history: history,
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load history",
    });
  }
});

// --- Clear All History ---
router.delete("/clear-all", requireAuth, async (req, res) => {
  try {
    const result = await History.deleteMany({ userId: req.session.userId });

    console.log(
      `✅ Cleared ${result.deletedCount} history items for user ${req.session.userId}`
    );

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} items from history`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error clearing history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clear history",
    });
  }
});

// --- Move Completed Items to History (called from dashboard) ---
router.post("/save-completed", requireAuth, async (req, res) => {
  try {
    console.log(`[DEBUG] Looking for completed items for user: ${req.session.userId}`);
    
    // Find all completed items for the user
    const completedItems = await Item.find({
      user: req.session.userId,
      completed: true,
    });

    console.log(`[DEBUG] Found ${completedItems.length} completed items:`, completedItems);

    if (completedItems.length === 0) {
      return res.json({
        success: true,
        message: "No completed items to move to history",
        movedCount: 0,
      });
    }

    // Prepare history documents
    const historyDocs = completedItems.map((item) => ({
      userId: req.session.userId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      category: item.category,
      clearedAt: new Date(),
    }));

    // Insert into history
    await History.insertMany(historyDocs);

    // Delete the completed items from main list
    const deleteResult = await Item.deleteMany({
      user: req.session.userId,
      completed: true,
    });

    console.log(
      `✅ Moved ${completedItems.length} items to history for user ${req.session.userId}`
    );

    res.json({
      success: true,
      message: `Moved ${completedItems.length} items to history`,
      movedCount: completedItems.length,
    });
  } catch (error) {
    console.error("Error moving items to history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to move items to history",
    });
  }
});

// --- Clear Shopping List (Dashboard Clear All) ---
router.delete("/clear-shopping-list", requireAuth, async (req, res) => {
  try {
    console.log(`[DEBUG] Looking for all items for user: ${req.session.userId}`);
    
    // First, move all items to history (both completed and pending)
    const allItems = await Item.find({ user: req.session.userId });

    if (allItems.length === 0) {
      return res.json({
        success: true,
        message: "Shopping list is already empty",
        clearedCount: 0,
      });
    }

    // Prepare history documents
    const historyDocs = allItems.map((item) => ({
      userId: req.session.userId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      category: item.category,
      clearedAt: new Date(),
    }));

    // Insert into history
    await History.insertMany(historyDocs);

    // Delete all items from shopping list
    const deleteResult = await Item.deleteMany({ user: req.session.userId });

    console.log(
      `✅ Cleared ${deleteResult.deletedCount} items and moved to history for user ${req.session.userId}`
    );

    res.json({
      success: true,
      message: `Cleared ${deleteResult.deletedCount} items from shopping list`,
      clearedCount: deleteResult.deletedCount,
    });
  } catch (error) {
    console.error("Error clearing shopping list:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clear shopping list",
    });
  }
});

// --- Get History Statistics ---
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const history = await History.find({ userId: req.session.userId });

    const totalItems = history.length;
    const totalSpent = history.reduce(
      (sum, item) => sum + (item.price || 0),
      0
    );

    // Count unique clearing dates
    const uniqueDates = new Set(
      history.map((item) => new Date(item.clearedAt).toDateString())
    );
    const listsCleared = uniqueDates.size;

    res.json({
      success: true,
      stats: {
        totalItems,
        totalSpent,
        listsCleared,
      },
    });
  } catch (error) {
    console.error("Error fetching history stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load statistics",
    });
  }
});

module.exports = router;