const User = require('../models/User');
const Hostel = require('../models/Hostel');
const Enquiry = require('../models/Enquiry');
const Notification = require('../models/Notification');
const PlatformUpdate = require('../models/PlatformUpdate');

// @desc    Get all users based on role
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    let query = {};
    if (role) {
      query.role = role;
    }
    const users = await User.find(query).select('-password');
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Also delete associated Hostels and Enquiries (Mock cascade delete)
    if (user.role === 'Owner') {
      const ownerHostels = await Hostel.find({ ownerId: user._id }, '_id');
      const hostelIds = ownerHostels.map(h => h._id);

      await Hostel.deleteMany({ ownerId: user._id });
      await Enquiry.deleteMany({ ownerId: user._id });

      if (hostelIds.length > 0) {
        await User.updateMany(
          { role: 'Student' },
          { $pull: { savedHostels: { $in: hostelIds } } }
        );
      }
    } else if (user.role === 'Student') {
      await Enquiry.deleteMany({ studentId: user._id });
    }

    await user.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get all platform listings
// @route   GET /api/admin/hostels
// @access  Private (Admin)
exports.getAllHostels = async (req, res) => {
  try {
    const hostels = await Hostel.find()
      .select('name isApproved address city views ownerId createdAt')
      .populate('ownerId', 'name email phone')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: hostels.length, data: hostels });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Approve or reject a hostel listing
// @route   PUT /api/admin/hostels/:id/approve
// @access  Private (Admin)
exports.approveHostel = async (req, res) => {
  try {
    const { isApproved } = req.body;
    let hostel = await Hostel.findById(req.params.id);

    if (!hostel) {
      return res.status(404).json({ success: false, message: 'Hostel not found' });
    }

    hostel.isApproved = isApproved;
    await hostel.save();

    const owner = await User.findById(hostel.ownerId);
    if (owner) {
      await Notification.create({
        recipientId: owner._id,
        message: `Your hostel listing "${hostel.name}" has been ${isApproved ? 'approved' : 'unapproved'} by the admin.`,
        type: isApproved ? 'success' : 'warning'
      });
    }

    res.status(200).json({ success: true, data: hostel });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get platform analytics
// @route   GET /api/admin/analytics
// @access  Private (Admin)
exports.getAnalytics = async (req, res) => {
  try {
    const studentCount = await User.countDocuments({ role: 'Student' });
    const ownerCount = await User.countDocuments({ role: 'Owner' });
    const hostelCount = await Hostel.countDocuments();
    const activeHostelCount = await Hostel.countDocuments({ isApproved: true });
    const enquiryCount = await Enquiry.countDocuments();

    const mostViewedHostels = await Hostel.find()
      .sort('-views')
      .limit(5)
      .select('name views');

    res.status(200).json({
      success: true,
      data: {
        users: { students: studentCount, owners: ownerCount },
        hostels: { total: hostelCount, active: activeHostelCount },
        enquiries: enquiryCount,
        mostViewedHostels
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get pending verifications
// @route   GET /api/admin/verifications
// @access  Private (Admin)
exports.getVerifications = async (req, res) => {
  try {
    const pendingUsers = await User.find({ verificationStatus: 'pending', role: 'Owner' }).select('-password');
    res.status(200).json({ success: true, count: pendingUsers.length, data: pendingUsers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Approve/Reject Verification
// @route   PUT /api/admin/verifications/:id
// @access  Private (Admin)
exports.approveVerification = async (req, res) => {
  try {
    const { status } = req.body; // 'verified' or 'rejected'

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be "verified" or "rejected".' });
    }

    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: { verificationStatus: status, isVerified: status === 'verified' }
      },
      { new: true }
    );

    if (user) {
      await Notification.create({
        recipientId: user._id,
        message: `Your account verification has been ${status}.`,
        type: status === 'verified' ? 'success' : 'warning'
      });
    }

    // Optionally update all their hostels to verified as well
    if (status === 'verified') {
      await Hostel.updateMany({ ownerId: user._id }, { $set: { isVerified: true } });
    } else {
      await Hostel.updateMany({ ownerId: user._id }, { $set: { isVerified: false } });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get all enquiries for admin tracking
// @route   GET /api/admin/enquiries
// @access  Private (Admin)
exports.getAllEnquiries = async (req, res) => {
  try {
    const enquiries = await Enquiry.find()
      .populate('studentId', 'name email phone')
      .populate('hostelId', 'name address city')
      .populate('ownerId', 'name phone')
      .sort('-createdAt');

    res.status(200).json({ success: true, count: enquiries.length, data: enquiries });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Respond to an enquiry as Admin
// @route   PUT /api/admin/enquiries/:id/respond
// @access  Private (Admin)
exports.respondToEnquiry = async (req, res) => {
  try {
    const { responseText } = req.body;
    let enquiry = await Enquiry.findById(req.params.id);

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    if (!responseText) {
      return res.status(400).json({ success: false, message: 'Response text is required' });
    }

    enquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      {
        adminResponse: responseText,
        status: 'Responded'
      },
      { returnDocument: 'after' }
    );

    const student = await User.findById(enquiry.studentId);
    if (student) {
      await Notification.create({
        recipientId: student._id,
        message: `An admin has responded to an enquiry you made.`,
        type: 'info'
      });
    }

    res.status(200).json({ success: true, data: enquiry });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get Deactivation Requests
// @route   GET /api/admin/deactivations
// @access  Private (Admin)
exports.getDeactivationRequests = async (req, res) => {
  try {
    const requests = await User.find({ deactivationStatus: 'pending' }).select('-password');
    res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Handle Deactivation Request (Approve/Reject)
// @route   PUT /api/admin/deactivations/:id
// @access  Private (Admin)
exports.handleDeactivationRequest = async (req, res) => {
  try {
    const { action } = req.body; // 'approve' or 'reject'
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (action === 'approve') {
      // Cascade delete logic (reusing deleteUser logic)
      if (user.role === 'Owner') {
        const ownerHostels = await Hostel.find({ ownerId: user._id }, '_id');
        const hostelIds = ownerHostels.map(h => h._id);

        await Hostel.deleteMany({ ownerId: user._id });
        await Enquiry.deleteMany({ ownerId: user._id });

        if (hostelIds.length > 0) {
          await User.updateMany(
            { role: 'Student' },
            { $pull: { savedHostels: { $in: hostelIds } } }
          );
        }
      } else if (user.role === 'Student') {
        await Enquiry.deleteMany({ studentId: user._id });
      }
      await user.deleteOne();
      return res.status(200).json({ success: true, message: 'User account deactivated and deleted.' });
    } else {
      user.deactivationStatus = 'none';
      user.deactivationReason = '';
      await user.save();
      return res.status(200).json({ success: true, message: 'Deactivation request rejected.' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Notify Owner
// @route   POST /api/admin/notify-owner/:id
// @access  Private (Admin)
exports.notifyOwner = async (req, res) => {
  try {
    const { message, type } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await Notification.create({
      recipientId: user._id,
      message,
      type: type || 'warning'
    });
    res.status(200).json({ success: true, message: 'Notification sent to owner.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Create Platform Update
// @route   POST /api/admin/updates
// @access  Private (Admin)
exports.createPlatformUpdate = async (req, res) => {
  try {
    const { title, message, targetRole } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }
    const update = await PlatformUpdate.create({ title, message, targetRole: targetRole || 'All' });
    res.status(201).json({ success: true, data: update });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get Platform Updates
// @route   GET /api/admin/updates
// @access  Private (Admin)
exports.getPlatformUpdates = async (req, res) => {
  try {
    const updates = await PlatformUpdate.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: updates.length, data: updates });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Delete Platform Update
// @route   DELETE /api/admin/updates/:id
// @access  Private (Admin)
exports.deletePlatformUpdate = async (req, res) => {
  try {
    const update = await PlatformUpdate.findByIdAndDelete(req.params.id);
    if (!update) {
      return res.status(404).json({ success: false, message: 'Update not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

