const Item = require('../models/ItemModel');

/**
 * Item Controller
 * Handles all item-related operations for authenticated users
 */

const itemController = {
  /**
   * Get all items for the authenticated user
   */
  getItems: async (req, res) => {
    try {
      const { completed, search } = req.query;
      const userId = req.user._id;

      const items = await Item.findByUser(userId, { 
        completed: completed === 'true' ? true : completed === 'false' ? false : undefined,
        search 
      });

      return res.status(200).json({
        success: true,
        message: 'Items retrieved successfully',
        data: items
      });

    } catch (error) {
      console.error(' Error getting items:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error while retrieving items'
      });
    }
  },

  /**
   * Create a new item for the authenticated user
   */
  createItem: async (req, res) => {
    try {
      const { name, quantity } = req.body;
      const userId = req.user._id;

      // Validation
      if (!name || name.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Item name is required'
        });
      }

      const item = new Item({
        name: name.trim(),
        quantity: quantity ? quantity.trim() : '1',
        user: userId
      });

      await item.save();

      return res.status(201).json({
        success: true,
        message: 'Item created successfully',
        data: item
      });

    } catch (error) {
      console.error(' Error creating item:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: Object.values(error.errors).map(err => err.message).join(', ')
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Server error while creating item'
      });
    }
  },

  /**
   * Update an item (only if user owns it)
   */
  updateItem: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, quantity } = req.body;
      const userId = req.user._id;

      // Find item and verify ownership
      const item = await Item.findOne({ _id: id, user: userId });
      
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Item not found or access denied'
        });
      }

      // Update fields
      if (name !== undefined) {
        if (!name.trim()) {
          return res.status(400).json({
            success: false,
            message: 'Item name cannot be empty'
          });
        }
        item.name = name.trim();
      }

      if (quantity !== undefined) {
        item.quantity = quantity ? quantity.trim() : '1';
      }

      item.updatedAt = new Date();
      await item.save();

      return res.status(200).json({
        success: true,
        message: 'Item updated successfully',
        data: item
      });

    } catch (error) {
      console.error(' Error updating item:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: Object.values(error.errors).map(err => err.message).join(', ')
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Server error while updating item'
      });
    }
  },

  /**
   * Toggle item completion status (only if user owns it)
   */
  toggleItem: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      // Find item and verify ownership
      const item = await Item.findOne({ _id: id, user: userId });
      
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Item not found or access denied'
        });
      }

      await item.toggleComplete();

      return res.status(200).json({
        success: true,
        message: `Item marked as ${item.completed ? 'completed' : 'pending'}`,
        data: item
      });

    } catch (error) {
      console.error(' Error toggling item:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error while updating item'
      });
    }
  },

  /**
   * Delete an item (only if user owns it)
   */
  deleteItem: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      // Find item and verify ownership
      const item = await Item.findOneAndDelete({ _id: id, user: userId });
      
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Item not found or access denied'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Item deleted successfully'
      });

    } catch (error) {
      console.error(' Error deleting item:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error while deleting item'
      });
    }
  },

  /**
   * Clear all completed items for the authenticated user
   */
  clearCompleted: async (req, res) => {
    try {
      const userId = req.user._id;

      const result = await Item.deleteMany({ 
        user: userId, 
        completed: true 
      });

      return res.status(200).json({
        success: true,
        message: `Cleared ${result.deletedCount} completed items`,
        data: { deletedCount: result.deletedCount }
      });

    } catch (error) {
      console.error(' Error clearing completed items:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error while clearing completed items'
      });
    }
  },

  /**
   * Get statistics for the authenticated user
   */
  getStatistics: async (req, res) => {
    try {
      const userId = req.user._id;

      const stats = await Item.getStatsByUser(userId);

      return res.status(200).json({
        success: true,
        message: 'Statistics retrieved successfully',
        data: stats
      });

    } catch (error) {
      console.error(' Error getting statistics:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error while retrieving statistics'
      });
    }
  }
};

module.exports = itemController;