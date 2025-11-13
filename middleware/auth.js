const User = require("../models/UserModel");

const requireAuth = async (req, res, next) => {
  // No session = unauthenticated
  if (!req.session.userId) {
    // If it's an API route, return JSON instead of redirect
    if (req.originalUrl.startsWith("/api/")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Please log in",
      });
    }
    console.log("when not logged in");
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
      console.log("user not found");
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
  console.log("=== Checking if user is authenticated ===");
  console.log("Session ID:", req.sessionID);
  console.log("User ID in session:", req.session?.userId);
  
  if (req.session?.userId) {
    console.log("✅ User is authenticated, redirecting to dashboard");
    return res.redirect("/dashboard");
  }
  
  console.log("❌ User is not authenticated, proceeding to login/register page");
  next();
};

const userInViews = (req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.isAuthenticated = !!req.session?.userId;
  next();
};

module.exports = {
  requireAuth,
  redirectIfAuthenticated,
  userInViews,
};