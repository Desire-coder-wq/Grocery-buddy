const mongoose = require('mongoose');

async function checkUser() {
  try {
    await mongoose.connect('mongodb://localhost:27017/Shopping_list');
    
    // Get the users collection directly
    const db = mongoose.connection.db;
    const user = await db.collection('users').findOne({ email: 'emily@gmail.com' });
    
    console.log('User record:', JSON.stringify(user, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkUser();
