const mongoose = require('mongoose');

const platformUpdateSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  targetRole: {
    type: String,
    enum: ['All', 'Student', 'Owner'],
    default: 'All'
  },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { 
    type: Date, 
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    index: { expires: 0 }
  }
});

module.exports = mongoose.model('PlatformUpdate', platformUpdateSchema);
