const Enquiry = require('../models/Enquiry');
const Hostel = require('../models/Hostel');
const Notification = require('../models/Notification');

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

    // Notify Owner about new enquiry
    await Notification.create({
      recipientId: hostel.ownerId,
      message: `New enquiry received for "${hostel.name}"`,
      type: 'info',
      targetTab: 'enquiries',
      targetId: enquiry._id
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
    let enquiry = await Enquiry.findById(req.params.id).populate('hostelId', 'name');

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    if (enquiry.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    enquiry.ownerReply = ownerReply;
    enquiry.status = 'Responded';
    enquiry.isReadByStudent = false; // Mark unread for student
    enquiry.isReadByOwner = true; // Owner has read it since they replied
    await enquiry.save();

    // Notify student about the reply
    const hostelName = enquiry.hostelId?.name || 'a hostel';
    await Notification.create({
      recipientId: enquiry.studentId,
      message: `The owner of "${hostelName}" has replied to your enquiry.`,
      type: 'info',
      targetTab: 'enquiries',
      targetId: enquiry._id
    });

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
      enquiry.isReadByStudent = false;
      enquiry.isReadByOwner = true;
    } else {
      enquiry.isReadByOwner = false;
      enquiry.isReadByStudent = true;
    }

    await enquiry.save();

    // Notify the other party about the new message
    const recipientId = isStudent ? enquiry.ownerId : enquiry.studentId;
    const senderLabel = isStudent ? 'A student' : 'A hostel owner';
    await Notification.create({
      recipientId,
      message: `${senderLabel} sent you a new message regarding an enquiry.`,
      type: 'info',
      targetTab: 'enquiries',
      targetId: enquiry._id
    });

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

    let enquiry = await Enquiry.findById(req.params.id).populate('hostelId', 'name');

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    if (enquiry.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this enquiry' });
    }

    enquiry.status = status;
    // Set or unset closedAt for auto-cleanup
    if (status === 'Closed') {
      enquiry.closedAt = new Date();
      enquiry.isReadByStudent = false;
      enquiry.isReadByOwner = true;
    } else {
      enquiry.closedAt = null;
    }
    await enquiry.save();

    // Notify student about status change
    const hostelName = enquiry.hostelId?.name || 'a hostel';
    if (status === 'Closed') {
      await Notification.create({
        recipientId: enquiry.studentId,
        message: `Your enquiry for "${hostelName}" has been closed by the owner.`,
        type: 'warning',
        targetTab: 'enquiries',
        targetId: enquiry._id
      });
    } else if (status === 'Responded') {
      await Notification.create({
        recipientId: enquiry.studentId,
        message: `The owner has responded to your enquiry for "${hostelName}".`,
        type: 'success',
        targetTab: 'enquiries',
        targetId: enquiry._id
      });
    }

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

// @desc    Bulk delete all enquiries for the logged-in owner
// @route   DELETE /api/enquiries/owner/bulk
// @access  Private (Owner)
exports.bulkDeleteOwnerEnquiries = async (req, res) => {
  try {
    const result = await Enquiry.deleteMany({ ownerId: req.user.id });
    res.status(200).json({ success: true, message: `${result.deletedCount} enquiries deleted` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Mark enquiries as read
// @route   PUT /api/enquiries/mark-read
// @access  Private (Student/Owner)
exports.markEnquiriesRead = async (req, res) => {
  try {
    if (req.user.role === 'Owner') {
      await Enquiry.updateMany({ ownerId: req.user.id, isReadByOwner: false }, { $set: { isReadByOwner: true } });
    } else if (req.user.role === 'Student') {
      await Enquiry.updateMany({ studentId: req.user.id, isReadByStudent: false }, { $set: { isReadByStudent: true } });
    }
    res.status(200).json({ success: true, message: 'Enquiries marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
