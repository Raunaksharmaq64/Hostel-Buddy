const mongoose = require('mongoose');

const hostelSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerName: { type: String, required: false },
  phone: { type: String, required: false },
  email: { type: String, required: false },
  aadhaarNumber: { type: String, required: false },
  name: { type: String, required: true },
  description: { type: String, required: true },
  
  // Location
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  locationMap: { type: String }, // Google maps iframe or lat/lng
  googleMapLink: { type: String }, // Direct URL
  locationCoordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  landmark: { type: String },
  
  // Images (URLs)
  thumbnailImage: { type: String },
  buildingPhotos: [{ type: String }],
  roomPhotos: [{ type: String }],
  messPhotos: [{ type: String }],
  washroomPhotos: [{ type: String }],
  environmentPhotos: [{ type: String }],

  // Pricing
  monthlyPrice: { type: Number, required: true },
  dailyPrice: { type: Number },
  depositAmount: { type: Number, required: true },
  
  // Details
  roomTypes: [{ type: String }], // Single, Double, Triple etc
  foodAvailability: { type: Boolean, default: false },
  foodDetails: { type: String },
  amenities: [{ type: String }], // WiFi, AC, Laundry, etc
  rules: { type: String }, // Markdown or text
  keywords: [{ type: String }],
  
  // Admin monitoring
  isApproved: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false }, // Syncs with Owner's verification
  rating: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Hostel', hostelSchema);
