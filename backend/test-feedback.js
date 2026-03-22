require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const PlatformFeedback = require('./models/PlatformFeedback');

async function testFeedback() {
  await connectDB();
  try {
    const student = await User.findOne({ role: 'Student' });
    const owner = await User.findOne({ role: 'Owner' });
    
    // 1. Submit feedbacks
    console.log('Submitting feedbacks...');
    const f1 = await PlatformFeedback.create({
      userId: student._id,
      role: student.role,
      rating: 5,
      comment: "This is a test feedback from a student!"
    });
    const f2 = await PlatformFeedback.create({
      userId: owner._id,
      role: owner.role,
      rating: 4,
      comment: "This is a test feedback from an owner!"
    });
    
    // 2. Fetch public (should be 0)
    let publicFeedbacks = await PlatformFeedback.find({ isApproved: true });
    console.log(`Public feedbacks before approval: ${publicFeedbacks.length} (Expected: 0)`);
    
    // 3. Admin loop - Approve one
    f1.isApproved = true;
    await f1.save();
    
    // 4. Fetch public again (should be 1)
    publicFeedbacks = await PlatformFeedback.find({ isApproved: true }).populate('userId', 'name profilePhoto');
    console.log(`Public feedbacks after approval: ${publicFeedbacks.length} (Expected: 1)`);
    console.log(`Public Feedback Content:`, publicFeedbacks[0].comment);
    
    // Cleanup test data
    await PlatformFeedback.deleteMany({});
    console.log('Test successful. Cleanup done.');
    
  } catch(e) {
    console.error('Test Failed:', e);
  } finally {
    process.exit(0);
  }
}

testFeedback();
