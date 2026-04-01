const express = require('express');
const {
  updateStudentProfile,
  updateOwnerProfile,
  requestVerification,
  requestDeactivation,
  getNotifications,
  markNotificationsRead,
  clearNotifications,
  getPlatformUpdates,
  markPlatformUpdatesRead
} = require('../controllers/profileController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.put('/student', protect, authorize('Student'), upload.single('profilePhoto'), updateStudentProfile);
router.put('/owner', protect, authorize('Owner'), upload.single('profilePhoto'), updateOwnerProfile);
router.post('/owner/request-verification', protect, authorize('Owner'), requestVerification);

// Deactivation & Notifications
router.post('/request-deactivation', protect, requestDeactivation);
router.get('/notifications', protect, getNotifications);
router.put('/notifications/read', protect, markNotificationsRead);
router.delete('/notifications', protect, clearNotifications);

// Platform Updates
router.get('/updates', protect, getPlatformUpdates);
router.put('/updates/read', protect, markPlatformUpdatesRead);

module.exports = router;

