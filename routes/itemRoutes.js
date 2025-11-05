const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Item = require('../models/ItemModel');
const { requireAuth } = require('../middleware/auth');

// Helper function to handle errors
const handleError = (res, error, message) => {
    console.error(`${message}:`, error);
    res.status(500).json({ 
        success: false, 
        message: error.message || 'Server error' 
    });
};

// @route   GET /api/items
// @desc    Get all items for the logged-in user
// @access  Private
router.get('/', requireAuth, async (req, res) => {
    try {
        const items = await Item.find({ user: req.session.userId })
            .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            count: items.length,
            data: items
        });
    } catch (error) {
        handleError(res, error, 'Error fetching items');
    }
});

// @route   GET /api/items/:id
// @desc    Get single item
// @access  Private
router.get('/:id', requireAuth, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid item ID' 
            });
        }

        const item = await Item.findOne({ 
            _id: req.params.id, 
            user: req.session.userId 
        });

        if (!item) {
            return res.status(404).json({ 
                success: false, 
                message: 'Item not found' 
            });
        }

        res.json({ success: true, data: item });
    } catch (error) {
        handleError(res, error, 'Error fetching item');
    }
});

// @route   POST /api/items
// @desc    Create a new item
// @access  Private
router.post('/', requireAuth, async (req, res) => {
    try {
        console.log('Request body:', req.body);
        console.log('Session user ID:', req.session.userId);
        
        const { name, quantity = '1' } = req.body;

        // Validation
        if (!name || typeof name !== 'string' || name.trim() === '') {
            console.log('Validation failed: Item name is required');
            return res.status(400).json({ 
                success: false, 
                message: 'Item name is required' 
            });
        }

        console.log('Creating new item with:', { name, quantity, userId: req.session.userId });
        
        const newItem = new Item({
            name: name.trim(),
            quantity: quantity.toString().trim(),
            user: req.session.userId
        });

        console.log('New item object:', newItem);
        
        const savedItem = await newItem.save();
        console.log('Item saved successfully:', savedItem);
        
        res.status(201).json({
            success: true,
            message: 'Item created successfully',
            data: savedItem
        });
    } catch (error) {
        console.error('Error in POST /api/items:', error);
        handleError(res, error, 'Error creating item');
    }
});

// @route   PUT /api/items/:id
// @desc    Update an item
// @access  Private
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { name, quantity, completed } = req.body;
        
        // Basic validation
        if (name && (typeof name !== 'string' || name.trim() === '')) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid item name' 
            });
        }

        const updateFields = {};
        if (name) updateFields.name = name.trim();
        if (quantity !== undefined) updateFields.quantity = quantity.toString().trim();
        if (completed !== undefined) updateFields.completed = completed;

        const updatedItem = await Item.findOneAndUpdate(
            { _id: req.params.id, user: req.session.userId },
            { $set: updateFields },
            { new: true, runValidators: true }
        );

        if (!updatedItem) {
            return res.status(404).json({ 
                success: false, 
                message: 'Item not found' 
            });
        }

        res.json({
            success: true,
            message: 'Item updated successfully',
            data: updatedItem
        });
    } catch (error) {
        handleError(res, error, 'Error updating item');
    }
});

// @route   PATCH /api/items/:id/toggle
// @desc    Toggle item completion status
// @access  Private
router.patch('/:id/toggle', requireAuth, async (req, res) => {
    try {
        const item = await Item.findOne({ 
            _id: req.params.id, 
            user: req.session.userId 
        });
        
        if (!item) {
            return res.status(404).json({ 
                success: false, 
                message: 'Item not found' 
            });
        }

        item.completed = !item.completed;
        const updatedItem = await item.save();
        
        res.json({
            success: true,
            message: 'Item toggled successfully',
            data: updatedItem
        });
    } catch (error) {
        handleError(res, error, 'Error toggling item');
    }
});

// @route   DELETE /api/items/:id
// @desc    Delete an item
// @access  Private
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const deletedItem = await Item.findOneAndDelete({ 
            _id: req.params.id, 
            user: req.session.userId 
        });
        
        if (!deletedItem) {
            return res.status(404).json({ 
                success: false, 
                message: 'Item not found' 
            });
        }
        
        res.json({
            success: true,
            message: 'Item deleted successfully',
            data: { id: req.params.id }
        });
    } catch (error) {
        handleError(res, error, 'Error deleting item');
    }
});

// @route   DELETE /api/items
// @desc    Clear all completed items
// @access  Private
router.delete('/', requireAuth, async (req, res) => {
    try {
        const result = await Item.deleteMany({ 
            user: req.session.userId,
            completed: true 
        });
        
        res.json({
            success: true,
            message: `Successfully deleted ${result.deletedCount} completed items`,
            data: result
        });
    } catch (error) {
        handleError(res, error, 'Error clearing completed items');
    }
});

module.exports = router;
