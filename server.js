require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const path = require("path");
const bcrypt = require("bcryptjs");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB 
const connectDB = require("./config/database");
connectDB();

const sessionConfig = {
  name: "grocery.sid",
  secret: process.env.SESSION_SECRET || "grocery buddy",
  resave: true,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl:
      process.env.MONGODB_URI || "mongodb://localhost:27017/Shopping_list",
    ttl: 24 * 60 * 60, // 1 day
    autoRemove: "native",
    collectionName: "sessions",
    stringify: false,
    touchAfter: 24 * 3600, // 24 hours
  }),
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    sameSite: "lax",
    path: "/",
  },
};

// In production, trust first proxy
if (app.get("env") === "production") {
  app.set("trust proxy", 1);
  sessionConfig.cookie.secure = true;
}

// Enhanced logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  
  // Log the incoming request
  console.log(`\n=== NEW REQUEST ===`);
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  
  // Log the request body for POST requests
  if (req.method === 'POST' && req.body) {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }

  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    
    // Log response body for debugging
    if (chunk) {
      try {
        const isJson = res.getHeader('content-type')?.includes('application/json');
        if (isJson) {
          const responseBody = JSON.parse(chunk.toString());
          console.log('Response:', JSON.stringify(responseBody, null, 2));
        }
      } catch (e) {
        console.log('Response (non-JSON):', chunk?.toString().substring(0, 500));
      }
    }
    
    // Call the original end function
    originalEnd.call(this, chunk, encoding);
  };

  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(session(sessionConfig));

// Flash middleware
app.use(flash());

// Make flash messages available in all views
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success");
  res.locals.error_msg = req.flash("error");
  next();
});

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log('Headers:', req.headers);
  console.log('Session ID:', req.sessionID);
  next();
});

// Save session before sending response
app.use((req, res, next) => {
  const send = res.send;
  res.send = function (body) {
    if (req.session) {
      req.session.save(() => send.call(this, body));
    } else {
      send.call(this, body);
    }
  };
  next();
});


// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public"), { index: false }));
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Set view engine and views directory
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// Prevent directory listing
app.use((req, res, next) => {
  if (req.path.endsWith('/') && req.path !== '/') {
    return res.redirect(301, req.path.slice(0, -1));
  }
  next();
});

const indexRoutes = require("./routes/indexRoutes");
const authRoutes = require("./routes/registerRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const itemRoutes = require("./routes/itemRoutes");
const { userInViews } = require("./middleware/auth");
const historyRoutes = require("./routes/historyRoutes");

app.use(userInViews);
app.use("/auth", authRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/history", historyRoutes);
app.use("/", indexRoutes);

// Catch-all route handler for undefined routes
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] [404] ${req.method} ${req.originalUrl} - Route not found`);
  
  // If the request is for an HTML file, redirect to the dashboard
  if (req.accepts('html')) {
    return res.redirect('/dashboard');
  }
  
  // For API requests, return a 404 JSON response
  if (req.accepts('json') && req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not Found' });
  }
  
  // For all other routes, redirect to dashboard
  res.redirect('/dashboard');
});

app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
});
