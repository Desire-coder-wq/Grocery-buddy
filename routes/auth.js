const express = require('express');
const router = express.Router();
const { redirectIfAuthenticated } = require('../middleware/auth');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Login route
router.post('/login', async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        // Set user session
        req.session.userId = user._id;
        
        // Set session cookie with longer expiration if rememberMe is true
        if (rememberMe) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        } else {
            req.session.cookie.expires = false; // Session cookie (expires when browser closes)
        }
        
        // Save the session before sending response
        req.session.save(err => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ success: false, message: 'Session error' });
            }
            
            res.json({ 
                success: true, 
                redirect: '/dashboard',
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name
                }
            });
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Check if user is authenticated
router.get('/check-auth', (req, res) => {
    res.json({ authenticated: !!req.session.userId });
});

// Render pages
router.get('/register', redirectIfAuthenticated, (req, res) => {
  res.render('register', { title: 'Register' });
});

router.get('/login', redirectIfAuthenticated, (req, res) => {
  res.render('login', { title: 'Login' });
});


module.exports = router;