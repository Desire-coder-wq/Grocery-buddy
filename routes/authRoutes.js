const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/UserModel');
const { sendPasswordResetEmail } = require('../utils/emailService');

// Forgot Password Page
router.get('/forgot-password', (req, res) => {
  res.render('forgot-password', { title: 'Forgot Password' });
});

// Handle Forgot Password Form Submission
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // 1. Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    // For security, don't reveal if the email exists or not
    if (!user) {
      return res.status(200).json({ 
        success: true,
        message: 'If an account with that email exists, you will receive a password reset link.'
      });
    }
    
    // 2. Generate reset token and set expiry (1 hour from now)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now
    
    // 3. Save token and expiry to user document
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();
    
    // 4. Send email with reset link
    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
    await sendPasswordResetEmail(user.email, resetUrl);
    
    res.status(200).json({ 
      success: true,
      message: 'If an account with that email exists, you will receive a password reset link.'
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred. Please try again.' 
    });
  }
});

// Reset Password Page
router.get('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // 1. Find user by token and check if it's not expired
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.render('reset-password', { 
        title: 'Invalid or Expired Token',
        token: null,
        error: 'The password reset link is invalid or has expired. Please request a new one.'
      });
    }
    
    // 2. Render reset password page with valid token
    res.render('reset-password', { 
      title: 'Reset Your Password',
      token: token
    });
    
  } catch (error) {
    console.error('Reset password page error:', error);
    res.status(500).send('An error occurred. Please try again.');
  }
});

// Handle Reset Password Form Submission
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    // 1. Find user by token and check if it's not expired
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: 'The password reset link is invalid or has expired. Please request a new one.'
      });
    }
    
    // 2. Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // 3. Update user's password and clear reset token
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    
    // 4. Send success response
    res.status(200).json({ 
      success: true,
      message: 'Your password has been reset successfully.'
    });
    
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while resetting your password. Please try again.' 
    });
  }
});

module.exports = router;