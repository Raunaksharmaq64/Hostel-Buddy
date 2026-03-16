const Enquiry = require('../models/Enquiry');
const Hostel = require('../models/Hostel');

// @desc    Send an enquiry
// @route   POST /api/enquiries
// @access  Private (Student)
exports.createEnquiry = async (req, res) => {
  try {
    const { hostelId, message } = req.body;

    const hostel = await Hostel.findById(hostelId);
    if (!hostel) {
      return res.status(404).json({ success: false, message: 'Hostel not found' });
    }

    const enquiry = await Enquiry.create({
      studentId: req.user.id,
      ownerId: hostel.ownerId,
      hostelId: hostel._id,
      message
    });

    res.status(201).json({ success: true, data: enquiry });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get enquiries for a student
// @route   GET /api/enquiries/student
// @access  Private (Student)
exports.getStudentEnquiries = async (req, res) => {
  try {
    const enquiries = await Enquiry.find({ studentId: req.user.id })
      .populate('hostelId', 'name address')
      .populate('ownerId', 'name phone');
      
    res.status(200).json({ success: true, count: enquiries.length, data: enquiries });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get enquiries for an owner
// @route   GET /api/enquiries/owner
// @access  Private (Owner)
exports.getOwnerEnquiries = async (req, res) => {
  try {
    const enquiries = await Enquiry.find({ ownerId: req.user.id })
      .populate('studentId', 'name email phone collegeName')
      .populate('hostelId', 'name');
      
    res.status(200).json({ success: true, count: enquiries.length, data: enquiries });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Update enquiry status
// @route   PUT /api/enquiries/:id/status
// @access  Private (Owner)
exports.updateEnquiryStatus = async (req, res) => {
  try {
    const { status } = req.body;

    let enquiry = await Enquiry.findById(req.params.id);

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    if (enquiry.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this enquiry' });
    }

    enquiry.status = status;
    await enquiry.save();

    res.status(200).json({ success: true, data: enquiry });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
