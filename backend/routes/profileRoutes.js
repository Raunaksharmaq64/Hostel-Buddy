const express = require('express');
const { updateStudentProfile, updateOwnerProfile, requestVerification } = require('../controllers/profileController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.put('/student', protect, authorize('Student'), upload.single('profilePhoto'), updateStudentProfile);
router.put('/owner', protect, authorize('Owner'), upload.single('profilePhoto'), updateOwnerProfile);
router.post('/owner/request-verification', protect, authorize('Owner'), requestVerification);

module.exports = router;
