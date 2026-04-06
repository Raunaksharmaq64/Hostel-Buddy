const Razorpay = require('razorpay');
const crypto = require('crypto');
const Hostel = require('../models/Hostel');
const sendEmail = require('../utils/sendEmail');
const { getInvoiceEmailContent } = require('../utils/emailTemplates');

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'dummy_id',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
});

// @desc    Create Razorpay Order
// @route   POST /api/payments/create-order
// @access  Private (Owner)
exports.createOrder = async (req, res) => {
  try {
    const { hostelId } = req.body;

    const hostel = await Hostel.findById(hostelId);
    if (!hostel) {
      return res.status(404).json({ success: false, message: 'Hostel not found' });
    }

    if (hostel.ownerId.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to configure payment for this hostel' });
    }

    const options = {
      amount: 1 * 100, // amount in the smallest currency unit (paise) setting at ruppes 1 just for testing after that i will set it mannually
      currency: "INR",
      receipt: `receipt_order_${hostelId}`,
      notes: {
        hostelId: hostelId
      }
    };

    const order = await razorpayInstance.orders.create(options);

    res.status(200).json({
      success: true,
      order: order
    });
  } catch (error) {
    console.error("Razorpay Order Error: ", error);
    if (error.statusCode || error.error) {
       return res.status(500).json({ success: false, message: 'Payment Gateway Error: Invalid Razorpay Keys. Please add valid keys in .env.' });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Verify Razorpay Payment
// @route   POST /api/payments/verify
// @access  Private (Owner)
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, hostelId } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'dummy_secret')
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      const hostel = await Hostel.findById(hostelId).populate('ownerId');
      
      if (!hostel) {
         return res.status(404).json({ success: false, message: 'Hostel not found' });
      }

      // Extend subscription by 30 days
      const now = new Date();
      let newExpiry;
      if (hostel.subscriptionStatus === 'active' && hostel.subscriptionExpiry && hostel.subscriptionExpiry > now) {
         newExpiry = new Date(hostel.subscriptionExpiry);
         newExpiry.setDate(newExpiry.getDate() + 30);
      } else {
         newExpiry = new Date();
         newExpiry.setDate(now.getDate() + 30);
      }

      hostel.subscriptionStatus = 'active';
      hostel.subscriptionExpiry = newExpiry;
      hostel.lastPaymentId = razorpay_payment_id;
      
      await hostel.save();

      // Send Invoice/Greeting Email async
      if (hostel.ownerId && hostel.ownerId.email) {
          const ownerName = hostel.ownerId.name || 'Owner';
          const htmlContent = getInvoiceEmailContent(ownerName, hostel.name, 299, newExpiry);
          
          sendEmail({
             email: hostel.ownerId.email,
             subject: 'Payment Successful - HostelBuddy Subscription Active!',
             html: htmlContent
          }).catch(err => console.error("Error sending invoice email: ", err));
      }

      res.status(200).json({
        success: true,
        message: 'Payment verified and subscription activated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid signature'
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
