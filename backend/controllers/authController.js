const User = require('../models/User');
const PlatformUpdate = require('../models/PlatformUpdate');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePhoto: user.profilePhoto
    }
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      if (user.isEmailVerified === false) {
        return res.status(400).json({ success: false, message: 'User exists but is not verified. Please login to verify your email.' });
      }
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Create user
    user = await User.create({
      name,
      email,
      password,
      role,
      phone,
      isEmailVerified: false,
      emailVerificationOtp: otp
    });

    // Send email
    const message = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #4CAF50; text-align: center;">Hostel Buddy</h2>
        <h3 style="color: #333;">Welcome to Hostel Buddy!</h3>
        <p style="color: #555; line-height: 1.5;">Hello ${user.name},</p>
        <p style="color: #555; line-height: 1.5;">Thank you for registering. Please verify your email address to activate your account. Use the One-Time Password (OTP) below:</p>
        <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; text-align: center; border-radius: 5px;">
          <h1 style="color: #333; margin: 0; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p style="color: #555; line-height: 1.5;">Do not share this OTP with anyone.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">This is an automated message, please do not reply.</p>
      </div>
    `;

    // Fire email in background so user gets instant response
    res.status(201).json({ success: true, requiresVerification: true, message: 'Please verify your email address with the OTP sent to you.' });
    sendEmail({
      email: user.email,
      subject: 'Hostel Buddy - Verify Your Email',
      html: message
    }).catch(err => console.error('Failed to send verification email:', err.message));
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validate email & password
    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Please provide an email, password, and select a role' });
    }

    // Check for user 
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if email is verified
    if (user.isEmailVerified !== undefined && !user.isEmailVerified) {
      return res.status(403).json({ success: false, requiresVerification: true, message: 'Please verify your email address to continue.' });
    }

    // Check if role matches
    if (user.role !== role) {
      return res.status(401).json({ success: false, message: `Account does not exist for role: ${role}` });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Check for unread platform updates
    const lastUpdate = await PlatformUpdate.findOne({ targetRole: { $in: ['All', user.role] } }).sort({ createdAt: -1 });
    let hasUnreadPlatformUpdates = false;
    if (lastUpdate) {
      hasUnreadPlatformUpdates = !user.lastReadPlatformUpdate || user.lastReadPlatformUpdate < lastUpdate.createdAt;
    }

    res.status(200).json({
      success: true,
      data: { ...user.toObject(), hasUnreadPlatformUpdates }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Forgot password / Send OTP
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'There is no user with that email' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set OTP and expiry (10 mins)
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpiry = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    // Send email
    const message = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #4CAF50; text-align: center;">Hostel Buddy</h2>
        <h3 style="color: #333;">Password Reset Verification</h3>
        <p style="color: #555; line-height: 1.5;">Hello ${user.name},</p>
        <p style="color: #555; line-height: 1.5;">You recently requested to reset your password for your Hostel Buddy account. Please use the following One-Time Password (OTP) to proceed:</p>
        <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; text-align: center; border-radius: 5px;">
          <h1 style="color: #333; margin: 0; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p style="color: #555; line-height: 1.5;">This OTP is valid for <strong>10 minutes</strong>. Do not share this OTP with anyone.</p>
        <p style="color: #555; line-height: 1.5;">If you did not request a password reset, please ignore this email or contact support.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">This is an automated message, please do not reply.</p>
      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Hostel Buddy - Password Reset OTP',
        html: message
      });

      res.status(200).json({ success: true, message: 'OTP sent to email' });
    } catch (err) {
      console.error('EMAIL SENDING ERROR (forgot password):', err);
      user.resetPasswordOtp = undefined;
      user.resetPasswordOtpExpiry = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({ success: false, message: 'Email could not be sent', error: err.message });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Please provide email and OTP' });
    }

    const user = await User.findOne({ 
      email,
      resetPasswordOtp: otp,
      resetPasswordOtpExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    res.status(200).json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email, OTP, and new password' });
    }

    const user = await User.findOne({ 
      email,
      resetPasswordOtp: otp,
      resetPasswordOtpExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Set new password
    user.password = password;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpiry = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Verify Email OTP
// @route   POST /api/auth/verify-email
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Please provide email and OTP' });
    }

    const user = await User.findOne({ 
      email,
      emailVerificationOtp: otp
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid OTP or email' });
    }

    user.isEmailVerified = true;
    user.emailVerificationOtp = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Resend Email Verification OTP
// @route   POST /api/auth/resend-verification
// @access  Public
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'There is no user with that email' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'Email is already verified' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.emailVerificationOtp = otp;
    await user.save({ validateBeforeSave: false });

    // Send email
    const message = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #4CAF50; text-align: center;">Hostel Buddy</h2>
        <h3 style="color: #333;">Verify Your Email</h3>
        <p style="color: #555; line-height: 1.5;">Hello ${user.name},</p>
        <p style="color: #555; line-height: 1.5;">Here is your newly generated One-Time Password (OTP) to verify your account:</p>
        <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; text-align: center; border-radius: 5px;">
          <h1 style="color: #333; margin: 0; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p style="color: #555; line-height: 1.5;">Do not share this OTP with anyone.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">This is an automated message, please do not reply.</p>
      </div>
    `;

    // Fire email in background so user gets instant response
    res.status(200).json({ success: true, message: 'OTP sent to email' });
    sendEmail({
      email: user.email,
      subject: 'Hostel Buddy - Verify Your Email',
      html: message
    }).catch(err => console.error('Failed to send resend-verification email:', err.message));
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
