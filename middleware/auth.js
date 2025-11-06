const User = require("../models/UserModel");

const requireAuth = async (req, res, next) => {
  // No session = unauthenticated
  if (!req.session.userId) {
<<<<<<< HEAD
    // If it's an API route, return JSON instead of redirect
    if (req.originalUrl.startsWith("/api/")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Please log in",
      });
=======
    return res.redirect('/auth/login');
  }
  
  try {
    
    req.user = await User.findById(req.session.userId).select('-password');
    if (!req.user) {
      
      req.session.destroy();
      return res.redirect('/auth/login');
>>>>>>> 01a70e77c1370d735cdf309dce1d5b80f4a05d90
    }

    return res.redirect("/auth/login");
  }

  try {
    // Attach user to request for downstream use
    req.user = await User.findById(req.session.userId).select("-password");

    if (!req.user) {
      req.session.destroy();

      // Same logic: API vs non-API
      if (req.originalUrl.startsWith("/api/")) {
        return res.status(401).json({
          success: false,
          message: "User not found - Please log in again",
        });
      }

      return res.redirect("/auth/login");
    }

    next();
  } catch (error) {
    console.error("Error in requireAuth middleware:", error);
    req.session.destroy();

    if (req.originalUrl.startsWith("/api/")) {
      return res.status(500).json({
        success: false,
        message: "Internal server error in authentication",
      });
    }

    res.redirect("/auth/login");
  }
};

const redirectIfAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return res.redirect("/dashboard");
  }
  next();
};

const userInViews = (req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.isAuthenticated = !!req.session.userId;
  next();
};

module.exports = {
  requireAuth,
  redirectIfAuthenticated,
  userInViews,
};
