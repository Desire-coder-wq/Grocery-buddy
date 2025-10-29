require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session"); // ✅ Keep this one
const path = require("path");
const bcrypt = require("bcryptjs");
const MongoStore = require("connect-mongo"); // ✅ Move up here (not below)

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
require("./config/database");

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname)));

// Serve CSS files from the css directory
app.use("/css", express.static(path.join(__dirname, "css")));

// ✅ Remove the duplicate session declaration here
// ❌ const session = require('express-session');

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key-change-this",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl:
        process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/grocery-buddy",
      ttl: 24 * 60 * 60, // 1 day
      autoRemove: "native", // Remove expired sessions
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  })
);

// View engine setup
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// Import routes and middleware
const indexRoutes = require("./routes/indexRoutes");
const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboardRoutes");
const { userInViews } = require("./middleware/auth");

// Make user available to all views
app.use(userInViews);

// Use routes
app.use("/auth", authRoutes);
app.use("/", indexRoutes);
app.use("/dashboard", dashboardRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
