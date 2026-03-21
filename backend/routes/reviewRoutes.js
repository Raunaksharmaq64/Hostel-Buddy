const express = require('express');
const { createReview, getHostelReviews, getAllReviews, deleteReview } = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/hostel/:hostelId', getHostelReviews);
router.post('/', protect, authorize('Student'), createReview);

router.get('/', protect, authorize('Admin'), getAllReviews);
router.delete('/:id', protect, authorize('Admin'), deleteReview);

module.exports = router;
