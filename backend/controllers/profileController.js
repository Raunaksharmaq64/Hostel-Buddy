const User = require('../models/User');
const Notification = require('../models/Notification');
const Enquiry = require('../models/Enquiry');
const PlatformUpdate = require('../models/PlatformUpdate');
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

// @desc    Request Deactivation
// @route   POST /api/profiles/request-deactivation
// @access  Private (Student/Owner)
exports.requestDeactivation = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Please provide a reason for deactivation.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { deactivationStatus: 'pending', deactivationReason: reason } },
      { returnDocument: 'after' }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, message: 'Deactivation request submitted successfully.', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get Unread Counts for Badges
// @route   GET /api/profiles/notifications/unread-count
// @access  Private (Owner/Student)
exports.getUnreadCount = async (req, res) => {
  try {
    const notificationCount = await Notification.countDocuments({
      recipientId: req.user.id,
      isRead: false
    });

    let enquiryCount = 0;
    if (req.user.role === 'Owner') {
      enquiryCount = await Enquiry.countDocuments({ ownerId: req.user.id, status: 'Pending' });
    } else if (req.user.role === 'Student') {
      enquiryCount = await Enquiry.countDocuments({ studentId: req.user.id, status: 'Responded' });
    }

    const user = await User.findById(req.user.id);
    const lastRead = user.lastReadPlatformUpdate || new Date(0);
    const updatesCount = await PlatformUpdate.countDocuments({
      createdAt: { $gt: lastRead }
    });

    res.status(200).json({
      success: true,
      data: { notificationCount, enquiryCount, updatesCount }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get Notifications
// @route   GET /api/profiles/notifications
// @access  Private (Owner/Student)
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipientId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50); // Get latest 50 notifications

    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Mark Notifications as Read
// @route   PUT /api/profiles/notifications/read
// @access  Private (Owner/Student)
exports.markNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );
    res.status(200).json({ success: true, message: 'Notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Clear all notifications
// @route   DELETE /api/profiles/notifications
// @access  Private (Owner/Student)
exports.clearNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ recipientId: req.user.id });
    res.status(200).json({ success: true, message: 'Notifications cleared successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get Platform Updates for User
// @route   GET /api/profiles/updates
// @access  Private
exports.getPlatformUpdates = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Build query — only show updates newer than lastRead (if user has dismissed before)
    const query = { targetRole: { $in: ['All', user.role] } };
    if (user.lastReadPlatformUpdate) {
      query.createdAt = { $gt: user.lastReadPlatformUpdate };
    }

    const updates = await PlatformUpdate.find(query).sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: updates.length, data: updates });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Mark Platform Updates as Read
// @route   PUT /api/profiles/updates/read
// @access  Private
exports.markPlatformUpdatesRead = async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user.id },
      { $set: { lastReadPlatformUpdate: Date.now() } }
    );
    res.status(200).json({ success: true, message: 'Platform updates marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
