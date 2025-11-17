const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Item name is required"],
    trim: true,
  },
  quantity: {
    type: String,
    default: "1",
    trim: true,
  },
  price: {
    type: Number,
    default: 0,
  },
  category: {
    type: String,
    enum: [
      "Produce",
      "Dairy",
      "Meat",
      "Bakery",
      "Frozen",
      "Beverages",
      "Snacks",
      "Other",
    ],
    default: "Other",
  },
  completed: {
    type: Boolean,
    default: false,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries by user and category
itemSchema.index({ user: 1, category: 1, completed: 1, createdAt: -1 });

const Item = mongoose.model("Item", itemSchema);

module.exports = Item;
