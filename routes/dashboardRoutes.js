const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');

// Dashboard route - requires authentication
router.get('/', requireAuth, async (req, res) => {
    try {
        // Get user data from database (excluding password)
        const user = await User.findById(req.session.userId).select('-password');
        
        // If user not found in database, destroy session and redirect to login
        if (!user) {
            req.session.destroy();
            return res.redirect('/auth/login');
        }

        // Render dashboard with user data including profile image
        res.render('dashboard', { 
            title: 'Dashboard - Grocery Buddy',
            user: {
                id: user._id,
                username: user.username,  // Changed from name to username
                email: user.email,
                profileImage: user.profileImage  // Profile image from database
            }
        });
    } catch (error) {
        console.error('Error rendering dashboard:', error);
        req.session.destroy();
        res.redirect('/auth/login');
    }
});

module.exports = router;