const mongoose = require('mongoose');
const dns = require('dns');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function testConnection() {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
  
  const uri = process.env.MONGODB_URI;
  console.log("Testing connection with URI:", uri.replace(/:([^@]+)@/, ':****@'));
  
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log("Connected successfully to host:", conn.connection.host);
    const User = require('./models/User');
    const admin = await User.findOne({ username: '@admin' });
    console.log("Admin query test:", admin ? admin.username : 'not found');
    await mongoose.disconnect();
  } catch (err) {
    console.error("Connection failed:", err.message);
  }
}

testConnection();
