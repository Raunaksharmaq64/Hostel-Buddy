const Hostel = require('../models/Hostel');
const User = require('../models/User');
const Review = require('../models/Review');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Helper function to upload buffer to Cloudinary
const uploadFromBuffer = (buffer, folderName) => {
  return new Promise((resolve, reject) => {
    let cld_upload_stream = cloudinary.uploader.upload_stream(
      { folder: folderName },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    streamifier.createReadStream(buffer).pipe(cld_upload_stream);
  });
};

// Helper function to upload an array of files concurrently
const uploadMultipleFiles = async (filesArray, folderName) => {
  if (!filesArray || filesArray.length === 0) return [];
  const uploadPromises = filesArray.map(file => uploadFromBuffer(file.buffer, folderName));
  const results = await Promise.all(uploadPromises);
  return results.map(result => result.secure_url);
};

// @desc    Get all hostels (with search and filter)
// @route   GET /api/hostels
// @access  Public
exports.getHostels = async (req, res) => {
  try {
    const { 
      location, 
      minPrice, 
      maxPrice, 
      foodAvailability, 
      roomType,
      sort,
      isVerified,
      facilities
    } = req.query;

    let query = {};
    
    // Only show approved and active listings by default
    query.isApproved = true;
    query.subscriptionStatus = 'active';

    if (location) {
      query.$or = [
        { city: { $regex: location, $options: 'i' } },
        { address: { $regex: location, $options: 'i' } },
        { landmark: { $regex: location, $options: 'i' } },
        { name: { $regex: location, $options: 'i' } },
        { keywords: { $regex: location, $options: 'i' } }
      ];
    }
    
    if (isVerified === 'true') {
      query.isVerified = true;
    }
    
    if (facilities) {
      const facilitiesList = facilities.split(',').map(f => new RegExp(f.trim(), 'i'));
      query.amenities = { $all: facilitiesList };
    }
    
    if (minPrice || maxPrice) {
      query.monthlyPrice = {};
      if (minPrice) query.monthlyPrice.$gte = Number(minPrice);
      if (maxPrice) query.monthlyPrice.$lte = Number(maxPrice);
    }
    
    if (foodAvailability) {
      query.foodAvailability = foodAvailability === 'true';
    }
    
    if (roomType) {
      query.roomTypes = { $in: [roomType] };
    }

    let queryStr = Hostel.find(query);

    // Sorting
    if (sort) {
      const sortBy = sort.split(',').join(' ');
      queryStr = queryStr.sort(sortBy);
    } else {
      queryStr = queryStr.sort('-createdAt'); // Default sort newest
    }

    const hostels = await queryStr;

    res.status(200).json({ success: true, count: hostels.length, data: hostels });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get single hostel
// @route   GET /api/hostels/:id
// @access  Public
exports.getHostel = async (req, res) => {
  try {
    const hostel = await Hostel.findById(req.params.id).populate('ownerId', 'name phone email profilePhoto isVerified');
    
    if (!hostel) {
      return res.status(404).json({ success: false, message: 'Hostel not found' });
    }
    
    // Increment views
    hostel.views += 1;
    await hostel.save();

    res.status(200).json({ success: true, data: hostel });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Create new hostel
// @route   POST /api/hostels
// @access  Private (Owner)
exports.createHostel = async (req, res) => {
  try {
    // Add user to req.body
    req.body.ownerId = req.user.id;
    
    // Handle files if uploaded via Cloudinary Stream, optimizing with Promise.all
    if (req.files) {
      const [thumbUrl, buildingPhotos, roomPhotos, messPhotos, washroomPhotos] = await Promise.all([
        req.files.thumbnailImage ? uploadMultipleFiles(req.files.thumbnailImage, "hostelbuddy_thumbnails") : Promise.resolve(null),
        req.files.buildingPhotos ? uploadMultipleFiles(req.files.buildingPhotos, "hostelbuddy_buildings") : Promise.resolve(null),
        req.files.roomPhotos ? uploadMultipleFiles(req.files.roomPhotos, "hostelbuddy_rooms") : Promise.resolve(null),
        req.files.messPhotos ? uploadMultipleFiles(req.files.messPhotos, "hostelbuddy_mess") : Promise.resolve(null),
        req.files.washroomPhotos ? uploadMultipleFiles(req.files.washroomPhotos, "hostelbuddy_washrooms") : Promise.resolve(null)
      ]);

      if (thumbUrl && thumbUrl.length > 0) req.body.thumbnailImage = thumbUrl[0];
      if (buildingPhotos) req.body.buildingPhotos = buildingPhotos;
      if (roomPhotos) req.body.roomPhotos = roomPhotos;
      if (messPhotos) req.body.messPhotos = messPhotos;
      if (washroomPhotos) req.body.washroomPhotos = washroomPhotos;
    }
    
    // Parse JSON strings to arrays/booleans if coming from formData
    if (typeof req.body.roomTypes === 'string') {
        req.body.roomTypes = JSON.parse(req.body.roomTypes);
    }
    if (typeof req.body.amenities === 'string') {
        req.body.amenities = JSON.parse(req.body.amenities);
    }
    if (typeof req.body.keywords === 'string') {
        req.body.keywords = JSON.parse(req.body.keywords);
    }
    if (typeof req.body.locationCoordinates === 'string') {
        req.body.locationCoordinates = JSON.parse(req.body.locationCoordinates);
    }

    // Bugfix: Inherit owner's verified status for the new hostel
    if (req.user && req.user.isVerified) {
        req.body.isVerified = true;
    }

    const hostel = await Hostel.create(req.body);

    res.status(201).json({ success: true, data: hostel });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Update hostel
// @route   PUT /api/hostels/:id
// @access  Private (Owner)
exports.updateHostel = async (req, res) => {
  try {
    let hostel = await Hostel.findById(req.params.id);
    
    if (!hostel) {
      return res.status(404).json({ success: false, message: 'Hostel not found' });
    }

    // Make sure user is hostel owner
    if (hostel.ownerId.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this hostel' });
    }

    // Handle file updates concurrent uploads via form-data (append to existing)
    if (req.files) {
      const [thumbUrl, newBuildingPhotos, newRoomPhotos, newMessPhotos, newWashroomPhotos] = await Promise.all([
        req.files.thumbnailImage ? uploadMultipleFiles(req.files.thumbnailImage, "hostelbuddy_thumbnails") : Promise.resolve(null),
        req.files.buildingPhotos ? uploadMultipleFiles(req.files.buildingPhotos, "hostelbuddy_buildings") : Promise.resolve(null),
        req.files.roomPhotos ? uploadMultipleFiles(req.files.roomPhotos, "hostelbuddy_rooms") : Promise.resolve(null),
        req.files.messPhotos ? uploadMultipleFiles(req.files.messPhotos, "hostelbuddy_mess") : Promise.resolve(null),
        req.files.washroomPhotos ? uploadMultipleFiles(req.files.washroomPhotos, "hostelbuddy_washrooms") : Promise.resolve(null)
      ]);

      if (thumbUrl && thumbUrl.length > 0) req.body.thumbnailImage = thumbUrl[0]; // Overwrite old thumbnail
      if (newBuildingPhotos) req.body.buildingPhotos = [...(hostel.buildingPhotos || []), ...newBuildingPhotos];
      if (newRoomPhotos) req.body.roomPhotos = [...(hostel.roomPhotos || []), ...newRoomPhotos];
      if (newMessPhotos) req.body.messPhotos = [...(hostel.messPhotos || []), ...newMessPhotos];
      if (newWashroomPhotos) req.body.washroomPhotos = [...(hostel.washroomPhotos || []), ...newWashroomPhotos];
    }

    // Parse JSON strings to arrays/booleans if coming from formData
    if (typeof req.body.roomTypes === 'string') {
        req.body.roomTypes = JSON.parse(req.body.roomTypes);
    }
    if (typeof req.body.amenities === 'string') {
        req.body.amenities = JSON.parse(req.body.amenities);
    }
    if (typeof req.body.keywords === 'string') {
        req.body.keywords = JSON.parse(req.body.keywords);
    }
    if (typeof req.body.locationCoordinates === 'string') {
        req.body.locationCoordinates = JSON.parse(req.body.locationCoordinates);
    }

    hostel = await Hostel.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after',
      runValidators: true
    });

    res.status(200).json({ success: true, data: hostel });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Delete hostel
// @route   DELETE /api/hostels/:id
// @access  Private (Owner, Admin)
exports.deleteHostel = async (req, res) => {
  try {
    const hostel = await Hostel.findById(req.params.id);
    
    if (!hostel) {
      return res.status(404).json({ success: false, message: 'Hostel not found' });
    }

    // Make sure user is hostel owner or admin
    if (hostel.ownerId.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this hostel' });
    }

    await hostel.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get hostels for logged in owner
// @route   GET /api/hostels/owner/my-hostels
// @access  Private (Owner)
exports.getOwnerHostels = async (req, res) => {
    try {
        const hostels = await Hostel.find({ ownerId: req.user.id });
        res.status(200).json({ success: true, count: hostels.length, data: hostels });
    } catch(error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Get platform stats
// @route   GET /api/hostels/stats
// @access  Public
exports.getPlatformStats = async (req, res) => {
  try {
    const verifiedListings = await Hostel.countDocuments({ isVerified: true });
    const studentsHelped = await User.countDocuments({ role: 'Student' });
    const citiesCovered = await Hostel.distinct('city').then(cities => cities.length);
    
    const reviews = await Review.aggregate([
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);
    
    let satisfactionRate = 98; // Fallback default
    if (reviews.length > 0 && reviews[0].avgRating) {
      satisfactionRate = Math.round((reviews[0].avgRating / 5) * 100);
    }

    res.status(200).json({
      success: true,
      data: {
        verifiedListings,
        studentsHelped,
        citiesCovered,
        satisfactionRate
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
