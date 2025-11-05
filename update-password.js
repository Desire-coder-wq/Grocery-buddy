const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/UserModel');

const updatePassword = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/Shopping_list', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Find the user
    const user = await User.findOne({ email: 'emily@gmail.com' });
    
    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('Current user:', {
      email: user.email,
      currentHash: user.password
    });

    // Update the password
    const newPassword = 'Password123';
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    // Save the updated user
    await user.save();
    
    console.log('Password updated successfully');
    console.log('New hash:', user.password);
    
    // Verify the new password
    const isMatch = await bcrypt.compare(newPassword, user.password);
    console.log('New password verification:', isMatch);
    
  } catch (error) {
    console.error('Error updating password:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
  }
};

updatePassword();
