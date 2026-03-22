const express = require('express');
const {
  submitFeedback,
  getPublicFeedbacks,
  getAllFeedbacks,
  updateFeedbackStatus,
  deleteFeedback
} = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/public', getPublicFeedbacks);

// Protected routes (users)
router.post('/submit', protect, authorize('Student', 'Owner', 'Admin'), submitFeedback);

// Admin routes
router.get('/admin', protect, authorize('Admin'), getAllFeedbacks);
router.put('/admin/:id', protect, authorize('Admin'), updateFeedbackStatus);
router.delete('/admin/:id', protect, authorize('Admin'), deleteFeedback);

module.exports = router;
