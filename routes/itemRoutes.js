const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const Item = require("../models/ItemModel");

// --------------------
// Helper: Validate MongoDB ObjectId
// --------------------
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// --------------------
// Helper: Normalize category to title case
// --------------------
function normalizeCategory(cat) {
  if (!cat) return 'Other';
  return cat.toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// --------------------
// Get all items
// --------------------
router.get("/", requireAuth, async (req, res) => {
  try {
    let items = await Item.find({ user: req.session.userId })
      .select('name quantity category completed createdAt')
      .sort({ createdAt: -1 })
      .lean();
    
    // Normalize categories for all items
    items = items.map(item => ({
      ...item,
      category: normalizeCategory(item.category)
    }));
    
    console.log('Sending items to client:', items);
    res.json({ success: true, items, count: items.length });
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ success: false, message: "Failed to fetch items" });
  }
});

// --------------------
// Get single item
// --------------------
router.get("/:id", requireAuth, async (req, res) => {
  if (!isValidObjectId(req.params.id))
    return res.status(400).json({ success: false, message: "Invalid item ID" });

  try {
    const item = await Item.findOne({
      _id: req.params.id,
      user: req.session.userId,
    });
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });

    res.json({ success: true, item });
  } catch (error) {
    console.error("Error fetching item:", error);
    res.status(500).json({ success: false, message: "Failed to fetch item" });
  }
});

// --------------------
// Create new item
// --------------------
router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, quantity, category } = req.body;

    if (!name || name.trim() === "")
      return res
        .status(400)
        .json({ success: false, message: "Item name is required" });

    const newItem = new Item({
      name: name.trim(),
      quantity: quantity ? quantity.trim() : "1",
      category: normalizeCategory(category),
      user: req.session.userId,
      completed: false,
    });
    
    console.log('Creating new item with category:', newItem.category);

    await newItem.save();
    res.status(201).json({
      success: true,
      message: "Item created successfully",
      item: newItem,
    });
  } catch (error) {
    console.error("Error creating item:", error);
    res.status(500).json({ success: false, message: "Failed to create item" });
  }
});

// --------------------
// Delete all completed items
// --------------------
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
    console.error("Error clearing completed items:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to clear completed items" });
  }
});

// --------------------
// Delete single item
// --------------------
router.delete("/:id", requireAuth, async (req, res) => {
  if (!isValidObjectId(req.params.id))
    return res.status(400).json({ success: false, message: "Invalid item ID" });

  try {
    const item = await Item.findOneAndDelete({
      _id: req.params.id,
      user: req.session.userId,
    });
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });

    res.json({
      success: true,
      message: "Item deleted successfully",
      deletedItem: item,
    });
  } catch (error) {
    console.error("Error deleting item:", error);
    res.status(500).json({ success: false, message: "Failed to delete item" });
  }
});

// --------------------
// Update item (PUT / PATCH)
// --------------------
router
  .route("/:id")
  .put(requireAuth, updateItem)
  .patch(requireAuth, updateItem);

async function updateItem(req, res) {
  if (!isValidObjectId(req.params.id))
    return res.status(400).json({ success: false, message: "Invalid item ID" });

  try {
    const { name, quantity, completed, category } = req.body;
    const item = await Item.findOne({
      _id: req.params.id,
      user: req.session.userId,
    });
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });

    if (name !== undefined && name.trim() !== "") item.name = name.trim();
    if (quantity !== undefined) item.quantity = quantity.trim();
    if (category !== undefined) item.category = category;
    if (completed !== undefined) item.completed = completed;

    await item.save();
    res.json({ success: true, message: "Item updated successfully", item });
  } catch (error) {
    console.error("Error updating item:", error);
    res.status(500).json({ success: false, message: "Failed to update item" });
  }
}

// --------------------
// Toggle completion
// --------------------
router.patch("/:id/toggle", requireAuth, async (req, res) => {
  if (!isValidObjectId(req.params.id))
    return res.status(400).json({ success: false, message: "Invalid item ID" });

  try {
    const item = await Item.findOne({
      _id: req.params.id,
      user: req.session.userId,
    });
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });

    item.completed = !item.completed;
    await item.save();

    res.json({
      success: true,
      message: `Item marked as ${item.completed ? "completed" : "incomplete"}`,
      item,
    });
  } catch (error) {
    console.error("Error toggling item:", error);
    res.status(500).json({ success: false, message: "Failed to toggle item" });
  }
});

// --------------------
// Get statistics
// --------------------
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
    console.error("Error fetching statistics:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch statistics" });
  }
});

module.exports = router;
