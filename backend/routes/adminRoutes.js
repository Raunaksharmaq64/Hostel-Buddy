const express = require('express');
const {
  getUsers,
  deleteUser,
  getAllHostels,
  approveHostel,
  getAnalytics,
  getVerifications,
  approveVerification,
  getAllEnquiries,
  respondToEnquiry,
  getDeactivationRequests,
  handleDeactivationRequest,
  notifyOwner
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply middleware to all routes
router.use(protect);
router.use(authorize('Admin'));

// User routes
router.get('/users', getUsers);
router.delete('/users/:id', deleteUser);

// Hostel routes
router.get('/hostels', getAllHostels);
router.put('/hostels/:id/approve', approveHostel);

// Analytics route
router.get('/analytics', getAnalytics);

// Verification routes
router.get('/verifications', getVerifications);
router.put('/verifications/:id', approveVerification);

// Enquiry Management 
router.get('/enquiries', getAllEnquiries);
router.put('/enquiries/:id/respond', respondToEnquiry);

// Deactivation Management
router.get('/deactivations', getDeactivationRequests);
router.put('/deactivations/:id', handleDeactivationRequest);

// Notification
router.post('/notify-owner/:id', notifyOwner);

module.exports = router;
