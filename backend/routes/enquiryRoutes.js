const express = require('express');
const {
  createEnquiry,
  getStudentEnquiries,
  getOwnerEnquiries,
  updateEnquiryStatus
} = require('../controllers/enquiryController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, authorize('Student'), createEnquiry);
router.get('/student', protect, authorize('Student'), getStudentEnquiries);
router.get('/owner', protect, authorize('Owner'), getOwnerEnquiries);
router.put('/:id/status', protect, authorize('Owner'), updateEnquiryStatus);

module.exports = router;
