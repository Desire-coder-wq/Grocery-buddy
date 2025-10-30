const User = require('../models/User');

const requireAuth = async (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/auth/login');
  }
  
  try {
    
    req.user = await User.findById(req.session.userId).select('-password');
    if (!req.user) {
      
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