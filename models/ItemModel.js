const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Item name is required'],
        trim: true
    },
    quantity: {
        type: String,
        default: '1',
        trim: true
    },
    completed: {
        type: Boolean,
        default: false
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Add index for better query performance
itemSchema.index({ user: 1, completed: 1, createdAt: -1 });

const Item = mongoose.model('Item', itemSchema);

module.exports = Item;
