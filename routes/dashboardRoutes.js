const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');

// Dashboard route - requires authentication
router.get('/', requireAuth, async (req, res) => {
    try {
        // Get user data (excluding password)
        const user = await User.findById(req.session.userId).select('-password');
        
        if (!user) {
            req.session.destroy();
            return res.redirect('/auth/login');
        }

        res.render('dashboard', { 
            title: 'Dashboard - ShopSmart',
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Error rendering dashboard:', error);
        req.session.destroy();
        res.redirect('/auth/login');
    }
});

module.exports = router;
