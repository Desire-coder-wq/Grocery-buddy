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
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    console.log('\n=== PASSWORD COMPARISON ===');
    console.log('Candidate password:', `"${candidatePassword}" (length: ${candidatePassword ? candidatePassword.length : 0})`);
    console.log('Stored hash:', this.password ? `"${this.password}" (length: ${this.password.length})` : 'No hash found');
    
    if (!candidatePassword || !this.password) {
      console.log('❌ Missing password or hash for comparison');
      return false;
    }
    
    // Check if the stored password is already hashed
    const isHash = /^\$2[aby]\$\d{2}\$[.\/A-Za-z0-9]{53}$/.test(this.password);
    console.log('Stored password is hashed:', isHash);
    
    if (!isHash) {
      console.log('⚠️ Stored password is not a valid bcrypt hash');
      // If it's not a hash, do a direct comparison (for testing)
      const directMatch = candidatePassword === this.password;
      console.log('Direct comparison result:', directMatch);
      return directMatch;
    }
    
    // If it is a hash, compare using bcrypt
    console.log('Comparing using bcrypt...');
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    
    if (!isMatch) {
      // For debugging: hash the candidate password to see what it would look like
      const testHash = await bcrypt.hash(candidatePassword, 10);
      console.log('Test hash of provided password:', testHash);
      console.log('Does test hash match stored hash?', testHash === this.password);
    }
    
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
  if (!this.isModified('password')) {
    console.log('Password not modified, skipping hash');
    return next();
  }
  
  try {
    console.log('\n=== PASSWORD HASHING ===');
    console.log('Original password:', this.password);
    
    // Check if password is already hashed
    const isAlreadyHashed = /^\$2[aby]\$\d{2}\$[.\/A-Za-z0-9]{53}$/.test(this.password);
    if (isAlreadyHashed) {
      console.log('Password is already hashed, skipping re-hash');
      return next();
    }
    
    console.log('Generating salt...');
    const salt = await bcrypt.genSalt(10);
    console.log('Salt generated:', salt);
    
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(this.password, salt);
    console.log('Password hashed successfully');
    
    this.password = hashedPassword;
    console.log('New password hash:', hashedPassword);
    
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
