const cron = require('node-cron');
const Hostel = require('../models/Hostel');
const sendEmail = require('./sendEmail');
const { getReminderEmailContent } = require('./emailTemplates');

const sendRenewalReminders = async () => {
  try {
    const now = new Date();
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 3);

    // Find active hostels whose subscription expires in the next 3 days
    const hostelsNearExpiry = await Hostel.find({
      subscriptionStatus: 'active',
      subscriptionExpiry: {
        $gt: now, // still active
        $lte: targetDate // expires within 3 days
      }
    }).populate('ownerId');

    for (const hostel of hostelsNearExpiry) {
      if (hostel.ownerId && hostel.ownerId.email) {
        const diffTime = Math.abs(hostel.subscriptionExpiry - now);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const htmlContent = getReminderEmailContent(
          hostel.ownerId.name || 'Hostel Owner',
          hostel.name,
          diffDays
        );

        await sendEmail({
          email: hostel.ownerId.email,
          subject: `Action Required: ${hostel.name} Subscription Expires in ${diffDays} days!`,
          html: htmlContent
        });
        console.log(`Sent reminder email to ${hostel.ownerId.email} for hostel ${hostel.name}`);
      }
    }
  } catch (error) {
    console.error('Error in cron job sending renewal reminders:', error);
  }
};

const startCronJobs = () => {
  // Run everyday at 8:00 AM (08:00)
  cron.schedule('0 8 * * *', () => {
    console.log('Running daily morning renewal reminder cron job');
    sendRenewalReminders();
  });

  // Run everyday at 8:00 PM (20:00)
  cron.schedule('0 20 * * *', () => {
    console.log('Running daily evening renewal reminder cron job');
    sendRenewalReminders();
  });

  console.log('Cron jobs scheduled successfully.');
};

module.exports = startCronJobs;
