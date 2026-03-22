require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const connectDB = require('./config/db');
const Hostel = require('./models/Hostel');
const User = require('./models/User');

connectDB().then(async () => {
  try {
    let out = '';
    const verifiedOwners = await User.find({ isVerified: true });
    out += 'Verified Owners Count: ' + verifiedOwners.length + '\n';
    if(verifiedOwners.length > 0) {
      out += 'First verified owner ID: ' + verifiedOwners[0]._id + '\n';
    }
    
    const hostels = await Hostel.find();
    out += 'All Hostels Count: ' + hostels.length + '\n';
    hostels.forEach(h => {
      out += `Hostel: ${h.name}, isVerified: ${h.isVerified}, ownerId: ${h.ownerId}\n`;
    });
    fs.writeFileSync('db-state.txt', out);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
});
