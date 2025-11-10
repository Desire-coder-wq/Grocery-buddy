const User = require('../models/UserModel');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

/**
 * User Controller
 * Handles user registration and authentication
 */

const userController = {
  /**
   * Register a new user
   */
  register: async (req, res, profileImage) => {
    try {
      console.log('\n=== REGISTRATION PROCESS STARTED ===');
      const { username, email, password, confirmPassword } = req.body;

      // Validation checks
      const errors = {};

      // Check required fields
      if (!username || username.trim() === '') {
        errors.username = 'Username is required';
      } else if (username.length < 3) {
        errors.username = 'Username must be at least 3 characters';
      } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        errors.username = 'Username can only contain letters, numbers, and underscores';
      }

      if (!email || email.trim() === '') {
        errors.email = 'Email is required';
      } else if (!/^\S+@\S+\.\S+$/.test(email)) {
        errors.email = 'Please provide a valid email';
      }

      if (!password) {
        errors.password = 'Password is required';
      } else if (password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
      }

      if (!confirmPassword) {
        errors.confirmPassword = 'Please confirm your password';
      } else if (password !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }

      // Check for existing user
      if (!errors.username) {
        const existingUser = await User.findOne({ 
          username: username.trim().toLowerCase() 
        });
        if (existingUser) {
          errors.username = 'Username already taken';
        }
      }

      if (!errors.email) {
        const existingEmail = await User.findOne({ 
          email: email.trim().toLowerCase() 
        });
        if (existingEmail) {
          errors.email = 'Email already registered';
        }
      }

      // If there are validation errors
      if (Object.keys(errors).length > 0) {
        console.log(' Validation errors:', errors);
        return {
          success: false,
          status: 400,
          message: 'Please fix the errors below',
          errors: errors,
          deleteFile: !!profileImage // Delete file if validation fails
        };
      }

      console.log(' All validation passed');

      // Create user object
      const userData = {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password: password // Will be hashed by pre-save middleware
      };

      // Handle profile image
      if (profileImage) {
        userData.profileImage = `/uploads/${profileImage.filename}`;
        console.log('📸 Profile image saved:', userData.profileImage);
      }

      console.log('👤 Creating user with data:', {
        ...userData,
        password: '***' // Hide password in logs
      });

      // Create and save user
      const user = new User(userData);
      await user.save();

      console.log(' User created successfully:', user._id);

      // Set user session
      req.session.userId = user._id;
      req.session.username = user.username;
      req.session.email = user.email;
      req.session.profileImage = user.profileImage;

      console.log('🔐 User session created');

      return {
        success: true,
        status: 201,
        message: 'Registration successful! Welcome to Grocery Buddy!',
        redirectTo: '/dashboard',
        deleteFile: false // Keep the file since registration succeeded
      };

    } catch (error) {
      console.error('\n REGISTRATION CONTROLLER ERROR:', error);

      // Handle duplicate key errors (should be caught by validation but just in case)
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
        
        return {
          success: false,
          status: 400,
          message: message,
          errors: { [field]: message },
          deleteFile: !!profileImage
        };
      }

      // Handle validation errors from mongoose
      if (error.name === 'ValidationError') {
        const errors = {};
        Object.keys(error.errors).forEach(key => {
          errors[key] = error.errors[key].message;
        });

        return {
          success: false,
          status: 400,
          message: 'Please fix the errors below',
          errors: errors,
          deleteFile: !!profileImage
        };
      }

      // Generic server error
      return {
        success: false,
        status: 500,
        message: 'Server error during registration',
        deleteFile: !!profileImage
      };
    }
  },

  /**
   * Login user
   */
  login: async (req, res) => {
    try {
      console.log('\n=== LOGIN ATTEMPT ===');
      const { email, password } = req.body;

      // Validation
      const errors = {};

      if (!email || email.trim() === '') {
        errors.email = 'Email is required';
      }

      if (!password) {
        errors.password = 'Password is required';
      }

      if (Object.keys(errors).length > 0) {
        return {
          success: false,
          status: 400,
          message: 'Please fix the errors below',
          errors: errors
        };
      }

      // Find user by email
      const user = await User.findOne({ email: email.trim().toLowerCase() });
      
      if (!user) {
        console.log(' User not found with email:', email);
        return {
          success: false,
          status: 401,
          message: 'Invalid email or password',
          errors: { email: 'Invalid email or password' }
        };
      }

      console.log(' User found:', user.username);

      // Compare passwords
      console.log(' Comparing passwords...');
      const isPasswordValid = await user.comparePassword(password);
      
      if (!isPasswordValid) {
        console.log(' Invalid password');
        return {
          success: false,
          status: 401,
          message: 'Invalid email or password',
          errors: { password: 'Invalid email or password' }
        };
      }

      console.log(' Password valid');

      // Set user session
      req.session.userId = user._id;
      req.session.username = user.username;
      req.session.email = user.email;
      req.session.profileImage = user.profileImage;

      console.log(' Login session created for user:', user.username);

      return {
        success: true,
        status: 200,
        message: 'Login successful!',
        redirectTo: '/dashboard'
      };

    } catch (error) {
      console.error('\n LOGIN CONTROLLER ERROR:', error);
      return {
        success: false,
        status: 500,
        message: 'Server error during login'
      };
    }
  },

  /**
   * Get user profile
   */
  getProfile: async (req, res) => {
    try {
      const user = await User.findById(req.user._id).select('-password');
      
      if (!user) {
        return {
          success: false,
          status: 404,
          message: 'User not found'
        };
      }

      return {
        success: true,
        status: 200,
        message: 'Profile retrieved successfully',
        data: user
      };

    } catch (error) {
      console.error(' Error getting profile:', error);
      return {
        success: false,
        status: 500,
        message: 'Server error while retrieving profile'
      };
    }
  },

  /**
   * Update user profile
   */
  updateProfile: async (req, res, profileImage) => {
    try {
      const { username, email, currentPassword, newPassword } = req.body;
      const userId = req.user._id;

      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          status: 404,
          message: 'User not found'
        };
      }

      const errors = {};
      const updates = {};

      // Validate username
      if (username && username !== user.username) {
        if (username.trim().length < 3) {
          errors.username = 'Username must be at least 3 characters';
        } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          errors.username = 'Username can only contain letters, numbers, and underscores';
        } else {
          const existingUser = await User.findOne({ 
            username: username.trim().toLowerCase(),
            _id: { $ne: userId }
          });
          if (existingUser) {
            errors.username = 'Username already taken';
          } else {
            updates.username = username.trim();
          }
        }
      }

      // Validate email
      if (email && email !== user.email) {
        if (!/^\S+@\S+\.\S+$/.test(email)) {
          errors.email = 'Please provide a valid email';
        } else {
          const existingEmail = await User.findOne({ 
            email: email.trim().toLowerCase(),
            _id: { $ne: userId }
          });
          if (existingEmail) {
            errors.email = 'Email already registered';
          } else {
            updates.email = email.trim().toLowerCase();
          }
        }
      }

      // Handle password change
      if (newPassword) {
        if (!currentPassword) {
          errors.currentPassword = 'Current password is required to change password';
        } else {
          const isCurrentPasswordValid = await user.comparePassword(currentPassword);
          if (!isCurrentPasswordValid) {
            errors.currentPassword = 'Current password is incorrect';
          } else if (newPassword.length < 8) {
            errors.newPassword = 'New password must be at least 8 characters';
          } else {
            updates.password = newPassword;
          }
        }
      }

      // Handle profile image
      if (profileImage) {
        // Delete old profile image if it's not the default
        if (user.profileImage && user.profileImage !== '/uploads/default-avatar.png') {
          const oldImagePath = path.join(__dirname, '..', user.profileImage);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
            console.log('🗑️ Deleted old profile image:', user.profileImage);
          }
        }
        updates.profileImage = `/uploads/${profileImage.filename}`;
      }

      // If there are validation errors
      if (Object.keys(errors).length > 0) {
        return {
          success: false,
          status: 400,
          message: 'Please fix the errors below',
          errors: errors,
          deleteFile: !!profileImage
        };
      }

      // Update user
      if (Object.keys(updates).length > 0) {
        Object.keys(updates).forEach(key => {
          user[key] = updates[key];
        });
        await user.save();

        // Update session
        if (updates.username) req.session.username = updates.username;
        if (updates.email) req.session.email = updates.email;
        if (updates.profileImage) req.session.profileImage = updates.profileImage;
      }

      return {
        success: true,
        status: 200,
        message: 'Profile updated successfully',
        data: {
          username: user.username,
          email: user.email,
          profileImage: user.profileImage
        },
        deleteFile: false
      };

    } catch (error) {
      console.error(' Error updating profile:', error);
      
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return {
          success: false,
          status: 400,
          message: `${field} already exists`,
          errors: { [field]: `${field} already exists` },
          deleteFile: !!profileImage
        };
      }

      return {
        success: false,
        status: 500,
        message: 'Server error while updating profile',
        deleteFile: !!profileImage
      };
    }
  },

  /**
   * Logout user
   */
  logout: (req, res) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error(' Error destroying session:', err);
          return {
            success: false,
            status: 500,
            message: 'Error during logout'
          };
        }
        
        res.clearCookie('connect.sid');
        return {
          success: true,
          status: 200,
          message: 'Logout successful',
          redirectTo: '/'
        };
      });
    } catch (error) {
      console.error(' Logout error:', error);
      return {
        success: false,
        status: 500,
        message: 'Server error during logout'
      };
    }
  }
};

module.exports = userController;