const Review = require('../models/Review');
const Hostel = require('../models/Hostel');

// @desc    Add review
// @route   POST /api/reviews
// @access  Private (Student)
exports.createReview = async (req, res) => {
  try {
    const { hostelId, rating, comment } = req.body;
    
    // Check if student already reviewed
    const existingReview = await Review.findOne({ studentId: req.user.id, hostelId });
    if(existingReview) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this hostel' });
    }

    const review = await Review.create({
      studentId: req.user.id,
      hostelId,
      rating: Number(rating),
      comment
    });
    
    const allReviews = await Review.find({ hostelId });
    const avgRating = allReviews.reduce((acc, item) => item.rating + acc, 0) / allReviews.length;
    await Hostel.findByIdAndUpdate(hostelId, { rating: avgRating });

    res.status(201).json({ success: true, data: review });
  } catch(error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get reviews for a hostel
// @route   GET /api/reviews/hostel/:hostelId
// @access  Public
exports.getHostelReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ hostelId: req.params.hostelId })
      .populate('studentId', 'name profilePhoto')
      .sort('-createdAt');
    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } catch(error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get all reviews
// @route   GET /api/reviews
// @access  Private (Admin)
exports.getAllReviews = async (req, res) => {
    try {
        const reviews = await Review.find()
            .populate('studentId', 'name')
            .populate('hostelId', 'name')
            .sort('-createdAt');
        res.status(200).json({ success: true, count: reviews.length, data: reviews });
    } catch(err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private (Admin)
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if(!review) return res.status(404).json({ success: false, message: 'Review not found' });
    
    const hostelId = review.hostelId;
    await review.deleteOne();
    
    const allReviews = await Review.find({ hostelId });
    const avgRating = allReviews.length > 0 ? allReviews.reduce((acc, item) => item.rating + acc, 0) / allReviews.length : 0;
    await Hostel.findByIdAndUpdate(hostelId, { rating: avgRating });

    res.status(200).json({ success: true, message: 'Review deleted successfully' });
  } catch(error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
