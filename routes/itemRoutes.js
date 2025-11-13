const express = require("express");
const router = express.Router();
const { requireAuth, checkApiAuth } = require("../middleware/auth");
const itemController = require("../controllers/itemController");

// Apply authentication middleware to all routes
router.use(requireAuth);

// --------------------
// GET Routes
// --------------------
router.get("/", itemController.getAllItems);
router.get("/stats/summary", itemController.getStats);
router.get("/:id", itemController.getItemById);

// --------------------
// POST Routes
// --------------------
router.post("/", itemController.createItem);

// --------------------
// PUT/PATCH Routes
// --------------------
router.put("/:id", itemController.updateItem);
router.patch("/:id", itemController.updateItem);
router.patch("/:id/toggle", itemController.toggleItem);

// --------------------
// DELETE Routes
// --------------------
router.delete("/completed/clear", itemController.clearCompletedItems);
router.delete("/:id", itemController.deleteItem);

module.exports = router;