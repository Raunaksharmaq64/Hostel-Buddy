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
      message,
      messages: [{
        senderId: req.user.id,
        senderModel: 'Student',
        text: message
      }]
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

    // Mask student phone number for privacy
    const maskedEnquiries = enquiries.map(enq => {
      const eqObj = enq.toObject();
      if (eqObj.studentId && eqObj.studentId.phone) {
        const phone = eqObj.studentId.phone;
        if (phone.length >= 4) {
          const masked = phone.slice(0, -4).replace(/./g, '*') + phone.slice(-4);
          eqObj.studentId.phone = masked;
        }
      }
      return eqObj;
    });

    res.status(200).json({ success: true, count: maskedEnquiries.length, data: maskedEnquiries });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Reply to an enquiry
// @route   PUT /api/enquiries/:id/reply
// @access  Private (Owner)
exports.replyToEnquiry = async (req, res) => {
  try {
    const { ownerReply } = req.body;
    let enquiry = await Enquiry.findById(req.params.id);

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    if (enquiry.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    enquiry.ownerReply = ownerReply;
    enquiry.status = 'Responded';
    await enquiry.save();

    res.status(200).json({ success: true, data: enquiry });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// @desc    Add a message to an enquiry thread
// @route   POST /api/enquiries/:id/message
// @access  Private (Student/Owner)
exports.addMessageToEnquiry = async (req, res) => {
  try {
    const { text } = req.body;
    let enquiry = await Enquiry.findById(req.params.id);

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    // Ensure authorized
    const isStudent = enquiry.studentId.toString() === req.user.id;
    const isOwner = enquiry.ownerId.toString() === req.user.id;

    if (!isStudent && !isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!text || text.trim() === '') {
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }

    enquiry.messages.push({
      senderId: req.user.id,
      senderModel: req.user.role || (isStudent ? 'Student' : 'Owner'),
      text: text
    });

    if (isOwner) {
      enquiry.status = 'Responded';
      enquiry.ownerReply = text; // Keep legacy field updated for single-reply backward compatibility
    }

    await enquiry.save();

    res.status(200).json({ success: true, data: enquiry });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
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

// @desc    Delete an enquiry
// @route   DELETE /api/enquiries/:id
// @access  Private (Student/Owner)
exports.deleteEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    // Ensure user deleting is either the student who created it or the owner
    const isStudent = enquiry.studentId.toString() === req.user.id;
    const isOwner = enquiry.ownerId.toString() === req.user.id;

    if (!isStudent && !isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this enquiry' });
    }

    await enquiry.deleteOne();
    res.status(200).json({ success: true, message: 'Enquiry deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

