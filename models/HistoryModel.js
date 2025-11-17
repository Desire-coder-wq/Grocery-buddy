const mongoose = require('mongoose');

const HistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: String,
    default: '1'
  },
  price: {
    type: Number,
    default: 0
  },
  category: {
    type: String,
    default: 'other'
  },
  clearedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for better performance
HistorySchema.index({ userId: 1, clearedAt: -1 });

module.exports = mongoose.model('History', HistorySchema);
