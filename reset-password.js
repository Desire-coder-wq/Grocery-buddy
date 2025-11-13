const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function resetPassword() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/Shopping_list', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log(' Connected to MongoDB');

    // Get the User model
    const User = require('./models/UserModel');
    
    // Find the user
    const user = await User.findOne({ email: 'emily@gmail.com' });
    
    if (!user) {
      console.log(' User not found');
      return;
    }

    console.log('\n=== CURRENT USER ===');
    console.log('Email:', user.email);
    console.log('Current password hash:', user.password);
    
    // Generate new password hash
    const newPassword = 'Password123';
    console.log('\n=== GENERATING NEW PASSWORD HASH ===');
    console.log('New password:', newPassword);
    
    const salt = await bcrypt.genSalt(10);
    console.log('Generated salt:', salt);
    
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    console.log('New hashed password:', hashedPassword);
    
    // Update the user's password
    user.password = hashedPassword;
    await user.save();
    
    console.log('\n Password has been reset successfully');
    console.log('New hash stored in database');
    
    // Verify the new password
    console.log('\n=== VERIFYING NEW PASSWORD ===');
    const isMatch = await bcrypt.compare(newPassword, user.password);
    console.log('Password verification result:', isMatch ? ' SUCCESS' : ' FAILED');
    
  } catch (error) {
    console.error(' Error resetting password:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the function
resetPassword();
