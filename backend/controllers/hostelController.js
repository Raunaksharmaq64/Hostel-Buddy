const Hostel = require('../models/Hostel');

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
    
    // Only show approved listings by default
    query.isApproved = true;

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
    
    // Handle files if uploaded via Cloudinary Stream
    if (req.files) {
      req.body.buildingPhotos = await uploadMultipleFiles(req.files.buildingPhotos, "hostelbuddy_buildings");
      req.body.roomPhotos = await uploadMultipleFiles(req.files.roomPhotos, "hostelbuddy_rooms");
      req.body.messPhotos = await uploadMultipleFiles(req.files.messPhotos, "hostelbuddy_mess");
      req.body.washroomPhotos = await uploadMultipleFiles(req.files.washroomPhotos, "hostelbuddy_washrooms");
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

    // Handle file updates if provided via form-data (append to existing)
    if (req.files) {
      if (req.files.buildingPhotos) {
          const newBuildingPhotos = await uploadMultipleFiles(req.files.buildingPhotos, "hostelbuddy_buildings");
          req.body.buildingPhotos = [...(hostel.buildingPhotos || []), ...newBuildingPhotos];
      }
      if (req.files.roomPhotos) {
          const newRoomPhotos = await uploadMultipleFiles(req.files.roomPhotos, "hostelbuddy_rooms");
          req.body.roomPhotos = [...(hostel.roomPhotos || []), ...newRoomPhotos];
      }
      if (req.files.messPhotos) {
          const newMessPhotos = await uploadMultipleFiles(req.files.messPhotos, "hostelbuddy_mess");
          req.body.messPhotos = [...(hostel.messPhotos || []), ...newMessPhotos];
      }
      if (req.files.washroomPhotos) {
          const newWashroomPhotos = await uploadMultipleFiles(req.files.washroomPhotos, "hostelbuddy_washrooms");
          req.body.washroomPhotos = [...(hostel.washroomPhotos || []), ...newWashroomPhotos];
      }
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
