const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const { requireAuth } = require('../middleware/auth');

// Apply authentication middleware to all item routes
router.use(requireAuth);

// GET all items for the authenticated user
router.get('/', itemController.getAllItems);

// POST create a new item
router.post('/', itemController.createItem);

// GET a single item by ID
router.get('/:id', itemController.getItemById);

// PUT update an item
router.put('/:id', itemController.updateItem);

// PATCH toggle item completion status
router.patch('/:id/toggle', itemController.toggleItem);

// DELETE a single item
router.delete('/:id', itemController.deleteItem);

// DELETE all completed items
router.delete('/completed/clear', itemController.clearCompletedItems);

// GET item statistics
router.get('/stats', itemController.getStats);

module.exports = router;