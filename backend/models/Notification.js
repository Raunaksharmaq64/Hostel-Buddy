const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'danger'],
    default: 'info'
  },
  targetTab: {
    type: String,
    default: null
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from creation
    index: { expires: 0 } // TTL: MongoDB auto-deletes when expiresAt is reached
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
