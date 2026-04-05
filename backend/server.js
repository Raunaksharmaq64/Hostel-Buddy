require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const startCronJobs = require('./utils/cronJobs');

// Initialize express app
const app = express();

connectDB();

// Initialize cron jobs
startCronJobs();

// Middleware
app.use(cors());
app.use(express.json()); // Body parser for JSON
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files (if frontend and backend are served together)
app.use(express.static(path.join(__dirname, '../frontend')));

// Base route test
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to Your Hostel Buddy API' });
});

// Import and mount routes
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const hostelRoutes = require('./routes/hostelRoutes');
const enquiryRoutes = require('./routes/enquiryRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/hostels', hostelRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/payments', paymentRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Server Error', error: err.message });
});

// Listen on port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`Server running at http://localhost:${PORT}`);
});
