const express = require('express');
const { createOrder, verifyPayment } = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/get-key', protect, (req, res) => {
  res.status(200).json({ key: process.env.RAZORPAY_KEY_ID });
});

router.post('/create-order', protect, authorize('Owner', 'Admin'), createOrder);
router.post('/verify', protect, authorize('Owner', 'Admin'), verifyPayment);

module.exports = router;
