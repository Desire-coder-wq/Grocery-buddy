const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');

// Import routes (SEPARATED)
const loginRoutes = require('./routes/loginRoutes');       // NEW: Separated login routes
const registerRoutes = require('./routes/registerRoutes'); // NEW: Separated register routes
const dashboardRoutes = require('./routes/dashboardRoutes');
const itemRoutes = require('./routes/itemRoutes');

// Import middleware
const { userInViews } = require('./middleware/auth');
router.use('/login', loginRoutes);
// Initialize Express app
const app = express();

/* ==================== MIDDLEWARE ==================== */

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

/* ==================== DATABASE CONNECTION ==================== */

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/grocery-buddy';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log(' MongoDB connected successfully');
  console.log(' Database:', mongoose.connection.name);
})
.catch(err => {
  console.error(' MongoDB connection error:', err);
  process.exit(1);
});

/* ==================== SESSION CONFIGURATION ==================== */

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGODB_URI,
    touchAfter: 24 * 3600, // Lazy session update (24 hours)
    collectionName: 'sessions'
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 hours (can be overridden by "Remember Me")
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax'
  },
  name: 'connect.sid' // Session cookie name
}));

// Make user available in all views
app.use(userInViews);

/* ==================== ROUTES ==================== */

// Authentication routes (SEPARATED)
app.use('/', loginRoutes);           // Handles: /login, /logout, /check-auth
app.use('/', registerRoutes);        // Handles: /register

// Dashboard and profile routes
app.use('/dashboard', dashboardRoutes);

// API routes for items
app.use('/api/items', itemRoutes);

/* ==================== ROOT ROUTE ==================== */

/**
 * @route   GET /
 * @desc    Redirect to dashboard if authenticated, otherwise to login
 * @access  Public
 */
app.get('/', (req, res) => {
  if (req.session && req.session.userId) {
    console.log('Authenticated user accessing root, redirecting to dashboard');
    return res.redirect('/dashboard');
  }
  console.log('👤 Unauthenticated user accessing root, redirecting to login');
  res.redirect('/login');
});

/* ==================== ERROR HANDLING ==================== */

/**
 * 404 Handler
 */
app.use((req, res, next) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
  
  // Check if it's an API request
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: 'API endpoint not found'
    });
  }
  
  // For web requests, render 404 page if exists, otherwise send simple message
  res.status(404).render('404', {
    title: 'Page Not Found',
    user: req.user || null
  });
});

/**
 * Global Error Handler
 */
app.use((err, req, res, next) => {
  console.error(' Error:', err);
  
  // Multer file upload errors
  if (err.message && err.message.includes('Only image files')) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors
    });
  }
  
  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
  
  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

/* ==================== GRACEFUL SHUTDOWN ==================== */

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

/* ==================== SERVER START ==================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║     🛒 Grocery Buddy Server Running       ║
╠════════════════════════════════════════════╣
║  Port:        ${PORT}                         ║
║  Environment: ${process.env.NODE_ENV || 'development'}              ║
║  Database:    ${mongoose.connection.name}           ║
║                                            ║
║  Routes Available:                         ║
║  ┌─ Authentication                         ║
║  ├─ GET  /login                            ║
║  ├─ POST /login                            ║
║  ├─ GET  /register                         ║
║  ├─ POST /register                         ║
║  └─ GET  /logout                           ║
║                                            ║
║  ┌─ Dashboard                              ║
║  ├─ GET  /dashboard                        ║
║  ├─ GET  /dashboard/profile                ║
║  └─ POST /dashboard/profile/update         ║
║                                            ║
║  ┌─ API (Items)                            ║
║  ├─ GET    /api/items                      ║
║  ├─ POST   /api/items                      ║
║  ├─ PUT    /api/items/:id                  ║
║  ├─ PATCH  /api/items/:id/toggle           ║
║  ├─ DELETE /api/items/:id                  ║
║  └─ DELETE /api/items/completed/clear      ║
╚════════════════════════════════════════════╝
  `);
});

module.exports = app;

/* ==================== NOTES ==================== */

/**
 * FILE STRUCTURE:
 * 
 * routes/
 * ├── login.js         (Authentication: login, logout, check-auth)
 * ├── register.js      (Registration with file upload)
 * ├── dashboard.js     (Dashboard and profile views)
 * └── items.js         (Item CRUD API)
 * 
 * controllers/
 * ├── userController.js    (User business logic)
 * └── itemController.js    (Item business logic)
 * 
 * models/
 * ├── UserModel.js     (User schema)
 * └── ItemModel.js     (Item schema)
 * 
 * middleware/
 * └── auth.js          (Authentication middleware)
 * 
 * 
 * ROUTE SEPARATION BENEFITS:
 * 
 * 1. Better Organization
 *    - Login logic in login.js
 *    - Registration logic in register.js
 *    - Each file has single responsibility
 * 
 * 2. Easier Maintenance
 *    - Find code faster
 *    - Modify without affecting other features
 * 
 * 3. Cleaner Code
 *    - Smaller files
 *    - Less scrolling
 *    - Better readability
 * 
 * 4. Team Collaboration
 *    - Multiple developers can work on different files
 *    - Less merge conflicts
 * 
 * 
 * TESTING:
 * 
 * 1. Start server:
 *    node app.js
 * 
 * 2. Test registration:
 *    http://localhost:3000/register
 * 
 * 3. Test login:
 *    http://localhost:3000/login
 * 
 * 4. Test dashboard:
 *    http://localhost:3000/dashboard
 * 
 * 5. Test API:
 *    curl http://localhost:3000/api/items
 */