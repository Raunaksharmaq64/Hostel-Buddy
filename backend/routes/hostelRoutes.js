const express = require('express');
const {
  getHostels,
  getHostel,
  createHostel,
  updateHostel,
  deleteHostel,
  getOwnerHostels,
  getPlatformStats,
  toggleSaveHostel,
  getSavedHostels
} = require('../controllers/hostelController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Public routes for fetching
router.get('/', getHostels);
router.get('/stats', getPlatformStats); // Must be before /:id to prevent "stats" being parsed as an id

// Student saved hostels (must be before /:id)
router.get('/saved/my-list', protect, authorize('Student'), getSavedHostels);
router.put('/:id/save', protect, authorize('Student'), toggleSaveHostel);

// Owner specific route (must be before /:id)
router.get('/owner/my-hostels', protect, authorize('Owner'), getOwnerHostels);

router.get('/:id', getHostel);

// Protected routes (Create, Update, Delete)
router.post(
  '/',
  protect,
  authorize('Owner', 'Admin'),
  upload.fields([
    { name: 'thumbnailImage', maxCount: 1 },
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
    { name: 'thumbnailImage', maxCount: 1 },
    { name: 'buildingPhotos', maxCount: 5 },
    { name: 'roomPhotos', maxCount: 10 },
    { name: 'messPhotos', maxCount: 5 },
    { name: 'washroomPhotos', maxCount: 5 }
  ]),
  updateHostel
);
router.delete('/:id', protect, authorize('Owner', 'Admin'), deleteHostel);

module.exports = router;
