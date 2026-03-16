const User = require('../models/User');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Configure cloudinary explicitly here if needed (it should auto-pick from .env usually)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper function to upload buffer to Cloudinary
const uploadFromBuffer = (req) => {
  return new Promise((resolve, reject) => {
    let cld_upload_stream = cloudinary.uploader.upload_stream(
      { folder: "hostelbuddy_profiles" },
      (error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error);
        }
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(cld_upload_stream);
  });
};

// @desc    Update Student Profile
// @route   PUT /api/profiles/student
// @access  Private (Student)
exports.updateStudentProfile = async (req, res) => {
  try {
    const {
      name,
      phone,
      fatherPhone,
      motherPhone,
      permanentAddress,
      collegeName,
      collegeAddress,
      governmentId
    } = req.body;

    // Build profile object
    const profileFields = {};
    if (name) profileFields.name = name;
    if (phone) profileFields.phone = phone;
    if (fatherPhone) profileFields.fatherPhone = fatherPhone;
    if (motherPhone) profileFields.motherPhone = motherPhone;
    if (permanentAddress) profileFields.permanentAddress = permanentAddress;
    if (collegeName) profileFields.collegeName = collegeName;
    if (collegeAddress) profileFields.collegeAddress = collegeAddress;
    if (governmentId) profileFields.governmentId = governmentId;

    if (req.file) {
      try {
        const result = await uploadFromBuffer(req);
        profileFields.profilePhoto = result.secure_url;
      } catch (uploadError) {
        return res.status(500).json({ success: false, message: 'Image upload failed', error: uploadError.message });
      }
    }

    let user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: profileFields },
      { returnDocument: 'after', runValidators: true }
    );

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Update Owner Profile
// @route   PUT /api/profiles/owner
// @access  Private (Owner)
exports.updateOwnerProfile = async (req, res) => {
  try {
    const { name, phone, address, city, hostelName, description, aadhaarNumber } = req.body;

    const profileFields = {};
    if (name) profileFields.name = name;
    if (phone) profileFields.phone = phone;
    if (address) profileFields.address = address;
    if (city) profileFields.city = city;
    if (hostelName) profileFields.hostelName = hostelName;
    if (description) profileFields.description = description;
    if (aadhaarNumber) profileFields.aadhaarNumber = aadhaarNumber;

    if (req.file) {
      try {
        const result = await uploadFromBuffer(req);
        profileFields.profilePhoto = result.secure_url;
      } catch (uploadError) {
        return res.status(500).json({ success: false, message: 'Image upload failed', error: uploadError.message });
      }
    }

    let user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: profileFields },
      { returnDocument: 'after', runValidators: true }
    );

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Request Verification
// @route   POST /api/profiles/owner/request-verification
// @access  Private (Owner)
exports.requestVerification = async (req, res) => {
  try {
    let user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check required fields before allowing verification request
    if (!user.aadhaarNumber || !user.hostelName || !user.address || !user.city) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please complete your profile including Aadhaar, Hostel Name, City, and Address before requesting verification.' 
      });
    }

    user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { verificationStatus: 'pending' } },
      { returnDocument: 'after' }
    );

    res.status(200).json({ success: true, message: 'Verification request submitted successfully.', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
