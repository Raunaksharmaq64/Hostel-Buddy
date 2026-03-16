const express = require('express');
const {
  getHostels,
  getHostel,
  createHostel,
  updateHostel,
  deleteHostel,
  getOwnerHostels
} = require('../controllers/hostelController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Public routes for fetching
router.get('/', getHostels);
router.get('/:id', getHostel);

// Owner specific route
router.get('/owner/my-hostels', protect, authorize('Owner'), getOwnerHostels);

// Protected routes (Create, Update, Delete)
router.post(
  '/',
  protect,
  authorize('Owner', 'Admin'),
  upload.fields([
    { name: 'buildingPhotos', maxCount: 5 },
    { name: 'roomPhotos', maxCount: 10 },
    { name: 'messPhotos', maxCount: 5 },
    { name: 'washroomPhotos', maxCount: 5 }
  ]),
  createHostel
);

router.put(
  '/:id',
  protect,
  authorize('Owner', 'Admin'),
  upload.fields([
    { name: 'buildingPhotos', maxCount: 5 },
    { name: 'roomPhotos', maxCount: 10 },
    { name: 'messPhotos', maxCount: 5 },
    { name: 'washroomPhotos', maxCount: 5 }
  ]),
  updateHostel
);
router.delete('/:id', protect, authorize('Owner', 'Admin'), deleteHostel);

module.exports = router;
