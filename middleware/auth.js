const User = require('../models/User');

const requireAuth = async (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/auth/login');
  }
  
  try {
    // Attach user to request for use in routes
    req.user = await User.findById(req.session.userId).select('-password');
    if (!req.user) {
      // User not found in database but session exists - clear session
      req.session.destroy();
      return res.redirect('/auth/login');
    }
    next();
  } catch (error) {
    console.error('Error in requireAuth middleware:', error);
    req.session.destroy();
    res.redirect('/auth/login');
  }
};

const redirectIfAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  next();
};

// Middleware to make user available to all templates
const userInViews = (req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.isAuthenticated = !!req.session.userId;
  next();
};

module.exports = { 
  requireAuth, 
  redirectIfAuthenticated, 
  userInViews 
};