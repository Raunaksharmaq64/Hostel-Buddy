const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
  
  message: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Responded', 'Closed'], 
    default: 'Pending' 
  },
  adminResponse: { type: String },
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Enquiry', enquirySchema);
