const express = require('express');
const router = express.Router();
const { redirectIfAuthenticated } = require('../middleware/auth');



// Render pages
router.get('/register', redirectIfAuthenticated, (req, res) => {
  res.render('register', { title: 'Register' });
});

router.get('/login', redirectIfAuthenticated, (req, res) => {
  res.render('login', { title: 'Login' });
});


module.exports = router;