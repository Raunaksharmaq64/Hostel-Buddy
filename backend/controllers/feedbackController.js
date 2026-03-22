const PlatformFeedback = require('../models/PlatformFeedback');

// @desc    Submit platform feedback
// @route   POST /api/feedback/submit
// @access  Private (Student, Owner)
exports.submitFeedback = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    const feedback = await PlatformFeedback.create({
      userId: req.user.id,
      role: req.user.role,
      rating,
      comment
    });

    res.status(201).json({ success: true, data: feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get public approved feedbacks
// @route   GET /api/feedback/public
// @access  Public
exports.getPublicFeedbacks = async (req, res) => {
  try {
    const feedbacks = await PlatformFeedback.find({ isApproved: true })
      .populate('userId', 'name profilePhoto collegeName hostelName')
      .sort('-createdAt')
      .limit(10); // recent 10 approved feedbacks

    res.status(200).json({ success: true, count: feedbacks.length, data: feedbacks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get all feedbacks for Admin
// @route   GET /api/feedback/admin
// @access  Private (Admin)
exports.getAllFeedbacks = async (req, res) => {
  try {
    const feedbacks = await PlatformFeedback.find()
      .populate('userId', 'name email role')
      .sort('-createdAt');
    res.status(200).json({ success: true, count: feedbacks.length, data: feedbacks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Update feedback approval status
// @route   PUT /api/feedback/admin/:id
// @access  Private (Admin)
exports.updateFeedbackStatus = async (req, res) => {
  try {
    const { isApproved } = req.body;
    const feedback = await PlatformFeedback.findByIdAndUpdate(
      req.params.id,
      { isApproved },
      { new: true, runValidators: true }
    );
    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }
    res.status(200).json({ success: true, data: feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Delete feedback
// @route   DELETE /api/feedback/admin/:id
// @access  Private (Admin)
exports.deleteFeedback = async (req, res) => {
  try {
    const feedback = await PlatformFeedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }
    await feedback.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
