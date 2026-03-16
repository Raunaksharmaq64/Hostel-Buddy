const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['Student', 'Owner', 'Admin'], 
    required: true 
  },
  phone: { type: String, required: true },
  profilePhoto: { type: String, default: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png' },

  // Role-specific fields (Student)
  fatherPhone: { type: String },
  motherPhone: { type: String },
  permanentAddress: { type: String },
  collegeName: { type: String },
  collegeAddress: { type: String },
  governmentId: { type: String }, // Aadhaar etc.
  savedHostels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Hostel' }],

  // Role-specific fields (Owner)
  address: { type: String },
  city: { type: String },
  hostelName: { type: String },
  description: { type: String },
  aadhaarNumber: { type: String },
  identityVerification: { type: String }, // document URL
  isVerified: { type: Boolean, default: false }, // Admin approval
  verificationStatus: { 
    type: String, 
    enum: ['unverified', 'pending', 'verified', 'rejected'], 
    default: 'unverified' 
  },

  createdAt: { type: Date, default: Date.now }
});

// Password hashing middleware
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
