const cron = require('node-cron');
const Hostel = require('../models/Hostel');
const User = require('../models/User');
const Enquiry = require('../models/Enquiry');
const Notification = require('../models/Notification');
const sendEmail = require('./sendEmail');
const { getReminderEmailContent, getComebackEmailContent } = require('./emailTemplates');

// ────────────────────────────────────────────────────────
// 1. Subscription Renewal Reminders (existing)
// ────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────
// 2. Come Back / Re-engagement Emails (NEW)
// ────────────────────────────────────────────────────────

const sendComebackEmails = async () => {
  try {
    const now = new Date();
    const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    // Find verified users (Student/Owner) who:
    // 1. Haven't logged in for 2+ days
    // 2. Haven't received a comeback email in the last 7 days (or never)
    const inactiveUsers = await User.find({
      role: { $in: ['Student', 'Owner'] },
      isEmailVerified: true,
      lastLoginAt: { $lt: twoDaysAgo, $ne: null },
      $or: [
        { comebackEmailSentAt: null },
        { comebackEmailSentAt: { $lt: sevenDaysAgo } }
      ]
    }).limit(50); // Rate limit: max 50 emails per cron run

    console.log(`Comeback cron: Found ${inactiveUsers.length} inactive user(s) to email.`);

    for (const user of inactiveUsers) {
      try {
        // Aggregate pending activity for this user
        const stats = { unreadEnquiries: 0, unreadNotifications: 0, totalViews: 0, totalHostels: 0 };

        if (user.role === 'Student') {
          stats.unreadEnquiries = await Enquiry.countDocuments({
            studentId: user._id,
            isReadByStudent: false
          });
        } else if (user.role === 'Owner') {
          stats.unreadEnquiries = await Enquiry.countDocuments({
            ownerId: user._id,
            isReadByOwner: false
          });

          // Total views across all owner's hostels
          const ownerHostels = await Hostel.find({ ownerId: user._id }).select('views');
          stats.totalHostels = ownerHostels.length;
          stats.totalViews = ownerHostels.reduce((sum, h) => sum + (h.views || 0), 0);
        }

        // Count unread notifications
        stats.unreadNotifications = await Notification.countDocuments({
          recipientId: user._id,
          isRead: false
        });

        // Generate and send the comeback email
        const htmlContent = getComebackEmailContent(user.name, user.role, stats);

        await sendEmail({
          email: user.email,
          subject: `👋 We miss you, ${user.name}! Here's what's waiting for you on HostelBuddy`,
          html: htmlContent
        });

        // Mark comeback email as sent
        await User.updateOne({ _id: user._id }, { comebackEmailSentAt: new Date() });

        console.log(`Sent comeback email to ${user.email} (${user.role})`);
      } catch (userErr) {
        console.error(`Failed to send comeback email to ${user.email}:`, userErr.message);
      }
    }
  } catch (error) {
    console.error('Error in cron job sending comeback emails:', error);
  }
};

// ────────────────────────────────────────────────────────
// Cron Schedule Registration
// ────────────────────────────────────────────────────────

const startCronJobs = () => {
  // Run everyday at 8:00 AM (08:00) — Renewal reminders
  cron.schedule('0 8 * * *', () => {
    console.log('Running daily morning renewal reminder cron job');
    sendRenewalReminders();
  });

  // Run everyday at 8:00 PM (20:00) — Renewal reminders
  cron.schedule('0 20 * * *', () => {
    console.log('Running daily evening renewal reminder cron job');
    sendRenewalReminders();
  });

  // Run everyday at 10:00 AM (10:00) — Comeback / Re-engagement emails
  cron.schedule('0 10 * * *', () => {
    console.log('Running daily comeback re-engagement email cron job');
    sendComebackEmails();
  });

  console.log('Cron jobs scheduled successfully.');
};

module.exports = startCronJobs;
