const express = require('express');
const {
  createEnquiry,
  getStudentEnquiries,
  getOwnerEnquiries,
  updateEnquiryStatus,
  deleteEnquiry
} = require('../controllers/enquiryController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, authorize('Student'), createEnquiry);
router.get('/student', protect, authorize('Student'), getStudentEnquiries);
router.get('/owner', protect, authorize('Owner'), getOwnerEnquiries);
router.put('/:id/status', protect, authorize('Owner'), updateEnquiryStatus);
router.delete('/:id', protect, deleteEnquiry); // Anyone who owns or created can delete

module.exports = router;
