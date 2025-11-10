const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const Item = require("../models/ItemModel");

// Get all items
router.get("/", requireAuth, async (req, res) => {
  try {
    const items = await Item.find({ user: req.session.userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      items: items,
      count: items.length,
    });
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch items",
    });
  }
});

// Get single item
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const item = await Item.findOne({
      _id: req.params.id,
      user: req.session.userId,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    res.json({ success: true, item });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch item",
    });
  }
});

// Create new item
router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, quantity } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Item name is required",
      });
    }

    const newItem = new Item({
      name: name.trim(),
      quantity: quantity ? quantity.trim() : "1",
      user: req.session.userId,
      completed: false,
    });

    await newItem.save();

    res.status(201).json({
      success: true,
      message: "Item created successfully",
      item: newItem,
    });
  } catch (error) {
    console.error("Error creating item:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create item",
    });
  }
});

// Update item (handles both PUT and PATCH)
router.all(["/:id", "/:id/update"], ["PUT", "PATCH"], requireAuth, async (req, res) => {
  try {
    const { name, quantity, completed } = req.body;

    const item = await Item.findOne({
      _id: req.params.id,
      user: req.session.userId,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    if (name !== undefined && name.trim() !== "") {
      item.name = name.trim();
    }
    if (quantity !== undefined) {
      item.quantity = quantity.trim();
    }
    if (completed !== undefined) {
      item.completed = completed;
    }

    await item.save();

    res.json({
      success: true,
      message: "Item updated successfully",
      item: item,
    });
  } catch (error) {
    console.error("Error updating item:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update item",
    });
  }
});

// Toggle completion
router.patch("/:id/toggle", requireAuth, async (req, res) => {
  try {
    const item = await Item.findOne({
      _id: req.params.id,
      user: req.session.userId,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    item.completed = !item.completed;
    await item.save();

    res.json({
      success: true,
      message: `Item marked as ${item.completed ? "completed" : "incomplete"}`,
      item: item,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to toggle item",
    });
  }
});

// Delete single item
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const item = await Item.findOneAndDelete({
      _id: req.params.id,
      user: req.session.userId,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    res.json({
      success: true,
      message: "Item deleted successfully",
      deletedItem: item,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete item",
    });
  }
});

// Delete all completed items
router.delete("/completed/clear", requireAuth, async (req, res) => {
  try {
    const result = await Item.deleteMany({
      user: req.session.userId,
      completed: true,
    });

    res.json({
      success: true,
      message: `${result.deletedCount} completed item(s) deleted`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to clear completed items",
    });
  }
});

// Get statistics
router.get("/stats/summary", requireAuth, async (req, res) => {
  try {
    const totalItems = await Item.countDocuments({ user: req.session.userId });
    const completedItems = await Item.countDocuments({
      user: req.session.userId,
      completed: true,
    });
    const pendingItems = totalItems - completedItems;

    res.json({
      success: true,
      stats: {
        totalItems,
        completedItems,
        pendingItems,
        completionRate:
          totalItems > 0 ? ((completedItems / totalItems) * 100).toFixed(1) : 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
    });
  }
});

module.exports = router;
