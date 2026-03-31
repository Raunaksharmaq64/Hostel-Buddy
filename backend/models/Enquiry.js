const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
  
  message: { type: String, required: true },
  messages: [{
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderModel: { type: String, enum: ['Student', 'Owner', 'Admin'] },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  status: { 
    type: String, 
    enum: ['Pending', 'Responded', 'Closed'], 
    default: 'Pending' 
  },
  adminResponse: { type: String },
  ownerReply: { type: String },
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Enquiry', enquirySchema);
