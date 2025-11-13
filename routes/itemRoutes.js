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
  if (!cat) return "Other";
  return cat
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// --------------------
// Get all items
// --------------------
router.get("/", requireAuth, async (req, res) => {
  console.log("GET /api/items - Session:", {
    userId: req.session.userId,
    isAuthenticated: req.session.isAuthenticated,
  });

  try {
    const items = await Item.find({ user: req.session.userId })
      .select("name quantity category price completed createdAt")
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Found ${items.length} items for user ${req.session.userId}`);

    // Normalize categories for all items
    const normalizedItems = items.map((item) => ({
      ...item,
      category: normalizeCategory(item.category),
    }));

    res.json({
      success: true,
      items: normalizedItems,
      count: normalizedItems.length,
    });
  } catch (error) {
    console.error("Error fetching items:", {
      error: error.message,
      stack: error.stack,
      userId: req.session.userId,
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch items",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
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
  console.log("POST /api/items - Request:", {
    body: req.body,
    session: {
      userId: req.session.userId,
      isAuthenticated: req.session.isAuthenticated,
    },
    headers: req.headers,
  });

  try {
    const { name, quantity, category, price } = req.body;

    // Validate required fields
    if (!name || name.trim() === "") {
      console.log("Validation failed: Item name is required");
      return res.status(400).json({
        success: false,
        message: "Item name is required",
        field: "name",
      });
    }

    // Normalize and validate category
    const normalizedCategory = normalizeCategory(category);
    const validCategories = [
      "Produce",
      "Dairy",
      "Meat",
      "Bakery",
      "Frozen",
      "Beverages",
      "Snacks",
      "Other",
    ];
    const finalCategory = validCategories.includes(normalizedCategory)
      ? normalizedCategory
      : "Other";

    // Parse and validate price
    const parsedPrice =
      price !== undefined && price !== null && price !== ""
        ? parseFloat(price)
        : 0;
    const finalPrice =
      !isNaN(parsedPrice) && parsedPrice >= 0 ? parsedPrice : 0;

    const newItem = new Item({
      name: name.trim(),
      quantity: quantity ? String(quantity).trim() : "1",
      category: finalCategory,
      price: finalPrice,
      user: req.session.userId,
      completed: false,
    });

    console.log("Creating new item:", {
      name: newItem.name,
      quantity: newItem.quantity,
      category: newItem.category,
      price: newItem.price,
      user: newItem.user,
    });

    const savedItem = await newItem.save().catch((saveError) => {
      console.error("Error saving item to database:", {
        error: saveError.message,
        stack: saveError.stack,
        name: saveError.name,
        code: saveError.code,
      });
      throw saveError;
    });

    console.log("Item created successfully:", savedItem._id);

    // Return the saved item with normalized category
    const responseItem = {
      ...savedItem.toObject(),
      category: finalCategory,
    };

    res.status(201).json({
      success: true,
      message: "Item created successfully",
      item: responseItem,
    });
  } catch (error) {
    console.error("Error creating item:", {
      message: error.message,
      name: error.name,
      code: error.code,
      errors: error.errors,
      stack: error.stack,
    });

    // Handle validation errors
    if (error.name === "ValidationError") {
      const errors = {};
      Object.keys(error.errors).forEach((key) => {
        errors[key] = error.errors[key].message;
      });
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "An item with this name already exists",
        field: "name",
      });
    }

    // Handle other errors
    res.status(500).json({
      success: false,
      message: "Failed to create item",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
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
    const { name, quantity, completed, category, price } = req.body;
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

    // Normalize and validate category before saving
    if (category !== undefined) {
      const normalizedCategory = normalizeCategory(category);
      const validCategories = [
        "Produce",
        "Dairy",
        "Meat",
        "Bakery",
        "Frozen",
        "Beverages",
        "Snacks",
        "Other",
      ];
      item.category = validCategories.includes(normalizedCategory)
        ? normalizedCategory
        : "Other";
    }

    // Parse and validate price
    if (price !== undefined) {
      const parsedPrice = parseFloat(price);
      item.price = !isNaN(parsedPrice) && parsedPrice >= 0 ? parsedPrice : 0;
    }

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
