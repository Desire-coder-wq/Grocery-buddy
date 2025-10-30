const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { redirectIfAuthenticated } = require('../middleware/auth');
const User = require('../models/User');
const bcrypt = require('bcryptjs');


const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Login page
router.get('/login', redirectIfAuthenticated, (req, res) => {
  res.render('login', { title: 'Login' });
});


router.post('/login', async (req, res) => {
  try {
    console.log(' Login attempt received:', { email: req.body.email, hasPassword: !!req.body.password });
    
    const { email, password, rememberMe } = req.body;

    // Validate input
    if (!email || !password) {
      console.log(' Missing email or password');
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Find user by email in the database
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    console.log(' User search result:', user ? `Found: ${user.username}` : 'Not found');
    
    // If user not found in database
    if (!user) {
      console.log(' User not registered');
      return res.status(400).json({ 
        success: false, 
        message: 'User not registered. Please create an account first.' 
      });
    }

    // Check password using bcrypt compare
    const isMatch = await bcrypt.compare(password, user.password);
    
    console.log('Password check:', isMatch ? 'Match' : 'No match');
    
    // If password doesn't match
    if (!isMatch) {
      console.log(' Invalid password');
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Set user session
    req.session.userId = user._id;

    
    if (rememberMe) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    } else {
      req.session.cookie.expires = false; // Session cookie
    }

    console.log(' User logged in:', user.username, '| Session ID:', req.session.id);

    
    req.session.save(err => {
      if (err) {
        console.error(' Session save error:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Session error. Please try again.' 
        });
      }

      console.log(' Session saved successfully');
      
      res.json({
        success: true,
        redirect: '/dashboard',
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          profileImage: user.profileImage
        }
      });
    });

  } catch (error) {
    console.error(' Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login. Please try again.' 
    });
  }
});

//  Register page
router.get('/register', redirectIfAuthenticated, (req, res) => {
  res.render('register', { title: 'Register' });
});

router.get('/check-username', async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        exists: false,
        message: 'Username is required'
      });
    }

    const user = await User.findOne({ username: username.trim() });
    res.json({ exists: !!user });
  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({
      exists: false,
      message: 'Error checking username'
    });
  }
});

// Check if email exists
router.get('/check-email', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        exists: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    res.json({ exists: !!user });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({
      exists: false,
      message: 'Error checking email'
    });
  }
});

//  Register new user
router.post('/register', upload.single('profileImage'), async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    const validationErrors = {};

    // Validate username
    if (!username || username.trim().length < 3) {
      validationErrors.username = 'Username must be at least 3 characters';
    } else if (username.length > 30) {
      validationErrors.username = 'Username cannot exceed 30 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      validationErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Validate email
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      validationErrors.email = 'Please provide a valid email address';
    }

    // Validate password
    if (!password || password.length < 8) {
      validationErrors.password = 'Password must be at least 8 characters';
    } else {
      if (!/[A-Z]/.test(password)) {
        validationErrors.password = 'Password must contain at least one uppercase letter';
      } else if (!/[a-z]/.test(password)) {
        validationErrors.password = 'Password must contain at least one lowercase letter';
      } else if (!/[0-9]/.test(password)) {
        validationErrors.password = 'Password must contain at least one number';
      }
    }

    // If validation errors, return them
    if (Object.keys(validationErrors).length > 0) {
      // Delete uploaded file if validation fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
        field: Object.keys(validationErrors)[0]
      });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username: username.trim() });
    if (existingUsername) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Username is already taken',
        field: 'username'
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingEmail) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Email is already registered',
        field: 'email'
      });
    }

    // Create new user
    const newUser = new User({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: password,
      profileImage: req.file ? `/uploads/${req.file.filename}` : '/uploads/default-avatar.png'
    });

    // Save user (password will be hashed automatically by pre-save hook)
    await newUser.save();

    console.log(' New user registered:', username);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        profileImage: newUser.profileImage,
        createdAt: newUser.createdAt
      }
    });

  } catch (error) {
    console.error('Registration error:', error);

    // Delete uploaded file if error occurs
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} is already taken`,
        field: field
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors,
        field: Object.keys(errors)[0]
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// GET: Logout
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.redirect('/dashboard');
    }
    res.redirect('/');
  });
});

// GET: Check authentication status
router.get('/check-auth', (req, res) => {
  res.json({ authenticated: !!req.session.userId });
});

module.exports = router;