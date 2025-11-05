const bcrypt = require('bcryptjs');

const testPassword = async () => {
  const password = 'Password123';
  const hash = '$2b$10$kINjC0IwlBaTn.WIfyV81uey6Wf7Grup1rLe5rOoZdVoEUI6KHQMq';
  
  try {
    const isMatch = await bcrypt.compare(password, hash);
    console.log('Password matches:', isMatch);
    
    if (!isMatch) {
      console.log('Testing if the password was hashed multiple times...');
      // Sometimes the password might be hashed multiple times
      const newHash = await bcrypt.hash(password, 10);
      console.log('New hash:', newHash);
      console.log('Compare new hash with original:', newHash === hash);
    }
  } catch (error) {
    console.error('Error comparing passwords:', error);
  }
};

testPassword();
