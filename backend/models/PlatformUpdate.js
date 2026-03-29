const mongoose = require('mongoose');

const platformUpdateSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  targetRole: { 
    type: String, 
    enum: ['All', 'Student', 'Owner'], 
    default: 'All' 
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PlatformUpdate', platformUpdateSchema);
