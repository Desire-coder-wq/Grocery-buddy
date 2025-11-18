const bcrypt = require("bcryptjs");
const User = require("../models/UserModel");
const fs = require("fs");
const path = require("path");

// --------------------
// Validation Helper
// --------------------
const validateRegistrationData = (data) => {
  const { username, email, password, confirmPassword } = data;
  const errors = {};

  // Username validation
  if (!username || username.trim() === "") {
    errors.username = "Username is required";
  } else if (username.length < 3) {
    errors.username = "Username must be at least 3 characters";
  } else if (username.length > 30) {
    errors.username = "Username cannot exceed 30 characters";
  } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.username =
      "Username can only contain letters, numbers, and underscores";
  }

  // Email validation
  if (!email || email.trim() === "") {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Please provide a valid email address";
  }

  // Password validation
  if (!password) {
    errors.password = "Password is required";
  } else if (password.length < 8) {
    errors.password = "Password must be at least 8 characters";
  } else if (!/[A-Z]/.test(password)) {
    errors.password = "Password must contain at least one uppercase letter";
  } else if (!/[a-z]/.test(password)) {
    errors.password = "Password must contain at least one lowercase letter";
  } else if (!/[0-9]/.test(password)) {
    errors.password = "Password must contain at least one number";
  }

  // Confirm password validation
  if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }

  return errors;
};

// --------------------
// Register User
// --------------------
exports.registerUser = async (req, res) => {
  console.log("\n=== REGISTRATION ATTEMPT ===");
  console.log("Body:", req.body);
  console.log("File:", req.file ? req.file.filename : "No file uploaded");

  try {
    const { username, email, password, confirmPassword } = req.body;

    // Validate input data
    const validationErrors = validateRegistrationData(req.body);

    if (Object.keys(validationErrors).length > 0) {
      // Delete uploaded file if validation fails
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      console.log("❌ Validation failed:", validationErrors);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { username: username.trim() },
        { email: email.trim().toLowerCase() },
      ],
    });

    if (existingUser) {
      // Delete uploaded file if user exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      const field =
        existingUser.email === email.trim().toLowerCase()
          ? "email"
          : "username";
      console.log(` ${field} already exists:`, existingUser[field]);

      return res.status(400).json({
        success: false,
        message: `This ${field} is already registered`,
        errors: { [field]: `This ${field} is already taken` },
      });
    }

    // Create new user with plaintext password
    // The UserModel pre-save hook will hash it
    const newUser = new User({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: password, // Pass plaintext; model will hash it in pre-save hook
      profileImage: req.file
        ? `/uploads/${req.file.filename}`
        : "/uploads/default-avatar.png",
    });

    const savedUser = await newUser.save();
    console.log(" User registered successfully:", {
      id: savedUser._id,
      username: savedUser.username,
      email: savedUser.email,
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully! Please login to continue.",
      redirectTo: "/auth/login",
    });
  } catch (error) {
    console.error("\n REGISTRATION ERROR:", error);

    // Delete uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // Handle mongoose validation errors
    if (error.name === "ValidationError") {
      const errors = {};
      Object.keys(error.errors).forEach((key) => {
        errors[key] = error.errors[key].message;
      });
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `This ${field} is already registered`,
        errors: { [field]: `This ${field} is already taken` },
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error during registration. Please try again.",
    });
  }
};


// Login User

exports.loginUser = async (req, res) => {
  console.log('\n=== LOGIN ATTEMPT ===');
  console.log('Body:', req.body);
  console.log('Session before login:', req.session);
  
  try {
    const { email, password, rememberMe } = req.body;

    // Validate input
    if (!email || !password) {
      console.log(' Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Find user by email
    console.log(' Looking for user with email:', email.trim().toLowerCase());
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    
    if (!user) {
      console.log(' User not found:', email);
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    console.log(' User found:', {
      id: user._id,
      email: user.email,
      username: user.username
    });
    
    // Compare passwords
    console.log(' Comparing password...');
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      console.log(' Password does not match');
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    console.log(' Password matched!');

    // Set session data
    req.session.userId = user._id;
    req.session.isAuthenticated = true;
    
    // Set cookie expiration based on "Remember Me"
    if (rememberMe) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      console.log('🔒 Remember Me enabled - 30 days session');
    } else {
      req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hours
      console.log('🔒 Standard session - 24 hours');
    }
    
    console.log('Session data set:', {
      userId: req.session.userId,
      isAuthenticated: req.session.isAuthenticated,
      sessionID: req.sessionID
    });

    // Save the session explicitly
    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error:', err);
        return res.status(500).json({
          success: false,
          message: 'Error saving session. Please try again.',
        });
      }

      console.log('✅ Session saved successfully');
      console.log('✅ Login successful for user:', user.email);

      // Remove password from response
      const userResponse = {
        id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
      };

      return res.json({
        success: true,
        message: 'Login successful',
        user: userResponse,
        redirect: '/dashboard',
      });
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login. Please try again.',
    });
  }
};

// --------------------
// Logout User
// --------------------
exports.logoutUser = (req, res) => {
  console.log('\n=== LOGOUT ATTEMPT ===');
  console.log('User ID:', req.session.userId);
  
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Error destroying session:', err);
      return res.status(500).json({
        success: false,
        message: 'Error logging out',
      });
    }
    
    console.log('✅ Session destroyed successfully');
    res.clearCookie('connect.sid');
    res.clearCookie('grocery.sid'); // Clear your custom session cookie name
    res.redirect('/auth/login');
  });
};

// --------------------
// Get User Profile
// --------------------
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile'
    });
  }
};

// --------------------
// Update User Profile
// --------------------
exports.updateUserProfile = async (req, res) => {
  try {
    const { username, email } = req.body;
    const user = await User.findById(req.session.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields if provided
    if (username && username.trim() !== '') user.username = username.trim();
    if (email && email.trim() !== '') user.email = email.trim().toLowerCase();

    // Handle profile image update if file was uploaded
    if (req.file) {
      // Delete old profile image if it's not the default
      if (user.profileImage !== '/uploads/default-avatar.png') {
        const oldImagePath = path.join(__dirname, '..', user.profileImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      user.profileImage = `/uploads/${req.file.filename}`;
    }

    await user.save();
    
    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    
    // Delete uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `This ${field} is already taken`,
        field
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};