app.get("/api/auth/check-username", async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        exists: false,
        message: "Username is required",
      });
    }

    const user = await User.findOne({ username: username.trim() });

    res.json({ exists: !!user });
  } catch (error) {
    console.error("Check username error:", error);
    res.status(500).json({
      exists: false,
      message: "Error checking username",
    });
  }
});

// Check if email exists
app.get("/api/auth/check-email", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        exists: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    res.json({ exists: !!user });
  } catch (error) {
    console.error("Check email error:", error);
    res.status(500).json({
      exists: false,
      message: "Error checking email",
    });
  }
});

// Register new user
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation object to store all errors
    const validationErrors = {};

    // ============================================
    // VALIDATION HELPER FUNCTIONS
    // ============================================

    // Validate username format
    function validateUsername(username) {
      const errors = [];

      if (!username || username.trim().length === 0) {
        errors.push("Username is required");
      } else if (username.length < 3) {
        errors.push("Username must be at least 3 characters");
      } else if (username.length > 30) {
        errors.push("Username cannot exceed 30 characters");
      } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        errors.push(
          "Username can only contain letters, numbers, and underscores"
        );
      }

      return errors;
    }

    // Validate email format
    function validateEmail(email) {
      const errors = [];

      if (!email || email.trim().length === 0) {
        errors.push("Email is required");
      } else if (!validator.isEmail(email)) {
        errors.push("Please provide a valid email address");
      }

      return errors;
    }

    // Validate password strength
    function validatePassword(password) {
      const errors = [];

      if (!password || password.length === 0) {
        errors.push("Password is required");
      } else {
        if (password.length < 8) {
          errors.push("Password must be at least 8 characters");
        }
        if (!/[A-Z]/.test(password)) {
          errors.push("Password must contain at least one uppercase letter");
        }
        if (!/[a-z]/.test(password)) {
          errors.push("Password must contain at least one lowercase letter");
        }
        if (!/[0-9]/.test(password)) {
          errors.push("Password must contain at least one number");
        }
      }

      return errors;
    }

    // ============================================
    // CLIENT-SIDE VALIDATION (Server Side)
    // ============================================

    // Validate username
    const usernameErrors = validateUsername(username);
    if (usernameErrors.length > 0) {
      validationErrors.username = usernameErrors[0];
    }

    // Validate email
    const emailErrors = validateEmail(email);
    if (emailErrors.length > 0) {
      validationErrors.email = emailErrors[0];
    }

    // Validate password
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      validationErrors.password = passwordErrors[0];
    }

    // If there are validation errors, return them
    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
        field: Object.keys(validationErrors)[0], // First field with error
      });
    }

    // ============================================
    // CHECK IF USERNAME ALREADY EXISTS
    // ============================================

    const existingUsername = await User.findOne({
      username: username.trim(),
    });

    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: "Username is already taken",
        field: "username",
      });
    }

    // ============================================
    // CHECK IF EMAIL ALREADY EXISTS
    // ============================================

    const existingEmail = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is already registered",
        field: "email",
      });
    }

    // ============================================
    // CREATE NEW USER
    // Password will be automatically hashed by the pre-save middleware
    // ============================================

    const newUser = new User({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: password, // Will be hashed automatically
    });

    // Save user to database
    await newUser.save();

    console.log("✅ New user registered:", username);

    // ============================================
    // RETURN SUCCESS RESPONSE
    // ============================================

    res.status(201).json({
      success: true,
      message: "Registration successful",
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${
          field.charAt(0).toUpperCase() + field.slice(1)
        } is already taken`,
        field: field,
      });
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      const errors = {};
      Object.keys(error.errors).forEach((key) => {
        errors[key] = error.errors[key].message;
      });

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors,
        field: Object.keys(errors)[0],
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error during registration. Please try again later.",
    });
  }
});
