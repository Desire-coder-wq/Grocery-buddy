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
    resetPasswordToken: {
      type: String,
      default: null
    },
    resetPasswordExpires: {
      type: Date,
      default: null
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    console.log('\n=== PASSWORD COMPARISON ===');
    console.log('Candidate password:', `"${candidatePassword}"`);
    
    if (!candidatePassword || !this.password) {
      console.log('❌ Missing password or hash for comparison');
      return false;
    }
    
    // Check if the stored password is already hashed
    const isHash = /^\$2[aby]\$\d{2}\$[.\/A-Za-z0-9]{53}$/.test(this.password);
    console.log('Stored password is hashed:', isHash);
    
    // Always use bcrypt.compare for security
    console.log('Comparing using bcrypt...');
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    
    console.log('✅ Password comparison result:', isMatch);
    return isMatch;
  } catch (error) {
    console.error('❌ Error in comparePassword:', error);
    return false;
  }
};

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    console.log('\n=== PASSWORD HASHING ===');
    console.log('Original password:', this.password);
    
    // Generate salt and hash the password
    const salt = await bcrypt.genSalt(10);
    console.log('Salt generated');
    
    this.password = await bcrypt.hash(this.password, salt);
    console.log('Password hashed successfully');
    
    next();
  } catch (error) {
    console.error('❌ Error hashing password:', error);
    next(error);
  }
});

// Create indexes for faster queries
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

module.exports = mongoose.model("User", userSchema);
