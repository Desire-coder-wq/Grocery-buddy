const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      match: [
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores",
      ],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
    },
    profileImage: {
      type: String,
      default: "/uploads/default-avatar.png",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// ✅ KEEP THIS VERSION - Remove the duplicate one below
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    console.log('\n=== PASSWORD COMPARISON ===');
    console.log('Candidate password:', `"${candidatePassword}"`);
    console.log('Stored hash exists:', !!this.password);
    
    if (!candidatePassword || !this.password) {
      console.log('❌ Missing password or hash for comparison');
      return false;
    }
    
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log('✅ Password comparison result:', isMatch);
    return isMatch;
  } catch (error) {
    console.error('❌ Error in comparePassword:', error);
    return false;
  }
};

// ✅ KEEP THIS VERSION - Remove the duplicate one below
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    console.log('Password not modified, skipping hash');
    return next();
  }
  
  try {
    console.log('\n=== PASSWORD HASHING ===');
    console.log('Original password before hash:', this.password);
    
    // Check if password is already hashed (shouldn't be, but just in case)
    const isAlreadyHashed = /^\$2[aby]\$\d{2}\$[.\/A-Za-z0-9]{53}$/.test(this.password);
    if (isAlreadyHashed) {
      console.log('Password is already hashed, skipping re-hash');
      return next();
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(this.password, salt);
    
    this.password = hashedPassword;
    console.log('Password hashed successfully');
    
    next();
  } catch (error) {
    console.error(' Error hashing password:', error);
    next(error);
  }
});

// 🚨 REMOVE THESE DUPLICATE METHODS (they appear later in your file):
/*
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Error comparing passwords');
  }
};

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});
*/

// Create indexes for faster queries
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

module.exports = mongoose.model("User", userSchema);