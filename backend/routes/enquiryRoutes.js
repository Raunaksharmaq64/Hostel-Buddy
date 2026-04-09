const express = require('express');
const {
  createEnquiry,
  getStudentEnquiries,
  getOwnerEnquiries,
  updateEnquiryStatus,
  replyToEnquiry,
  deleteEnquiry,
  addMessageToEnquiry,
  bulkDeleteOwnerEnquiries,
  markEnquiriesRead
} = require('../controllers/enquiryController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, authorize('Student'), createEnquiry);
router.get('/student', protect, authorize('Student'), getStudentEnquiries);
router.get('/owner', protect, authorize('Owner'), getOwnerEnquiries);
router.put('/mark-read', protect, markEnquiriesRead); // both student and owner
router.put('/:id/status', protect, authorize('Owner'), updateEnquiryStatus);
router.put('/:id/reply', protect, authorize('Owner'), replyToEnquiry);
router.delete('/owner/bulk', protect, authorize('Owner'), bulkDeleteOwnerEnquiries); // Must be before /:id
router.post('/:id/message', protect, addMessageToEnquiry); // both Student and Owner
router.delete('/:id', protect, deleteEnquiry); // Anyone who owns or created can delete

module.exports = router;
