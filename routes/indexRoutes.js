const express = require('express');
const router = express.Router();

// GET home page (handle both / and /index)
router.get(['/', '/index'], (req, res) => {
    console.log('Rendering index page...');
    try {
        res.render('index', { 
            title: 'ShopSmart - Your Personal Shopping List',
            user: req.session.user || null
        });
    } catch (error) {
        console.error('Error rendering index:', error);
        res.status(500).send('Error loading the page');
    }
});

module.exports = router;
