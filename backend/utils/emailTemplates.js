const HOSTEL_BUDDY_LOGO = 'https://cdn-icons-png.flaticon.com/512/3030/3030336.png'; // Example placeholder logo (you can update this with your actual logo URL)

// ────────────────────────────────────────────────────────
// HTML Escaping — prevents XSS/HTML injection in emails
// ────────────────────────────────────────────────────────

const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// ────────────────────────────────────────────────────────
// Shared layout helpers
// ────────────────────────────────────────────────────────

const baseStyles = `
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
  .content { padding: 40px 30px; color: #333; line-height: 1.8; }
  .content h1 { color: #2d3436; font-size: 22px; margin-bottom: 20px; }
  .content p { margin: 8px 0; }
  .message-box { background: #f8f9fa; border-left: 4px solid #6c5ce7; border-radius: 6px; padding: 16px 20px; margin: 20px 0; font-style: italic; color: #555; }
  .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #e9ecef; font-size: 15px; }
  .info-row:last-child { border-bottom: none; }
  .info-label { color: #636e72; font-weight: 600; }
  .info-value { color: #2d3436; font-weight: 500; }
  .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: 700; font-size: 13px; letter-spacing: 0.5px; text-transform: uppercase; }
  .footer { background: #2d3436; color: #b2bec3; text-align: center; padding: 25px 20px; font-size: 13px; line-height: 1.6; }
  .footer .admin-name { color: #dfe6e9; font-weight: 600; font-size: 14px; }
  .footer .admin-title { color: #fdcb6e; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
  .footer .divider { border: none; border-top: 1px solid #636e72; margin: 14px auto; width: 60%; }
  .footer .disclaimer { color: #636e72; font-size: 11px; margin-top: 10px; }
`;

const buildHeader = (gradient, emoji, title) => `
  <div style="background: linear-gradient(135deg, ${gradient}); padding: 30px 20px; text-align: center; color: white;">
    <img src="${HOSTEL_BUDDY_LOGO}" alt="HostelBuddy Logo" style="max-width: 60px; margin-bottom: 8px;" />
    <h2 style="margin: 0; font-size: 20px; letter-spacing: 1px;">HostelBuddy</h2>
    <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">${emoji} ${title}</p>
  </div>
`;

const buildFooter = () => `
  <div class="footer">
    <p class="admin-name">Raunak Sharma</p>
    <p class="admin-title">Founder & Lead — HostelBuddy</p>
    <hr class="divider" />
    <p>&copy; ${new Date().getFullYear()} HostelBuddy &mdash; Making Hostel Life Easier.</p>
    <p class="disclaimer">⚠️ This is an auto-generated email. Please do not reply to this message.<br/>For support, contact us through the HostelBuddy platform or email us at <a href="mailto:support.hostelbuddy.help@gmail.com" style="color: #74b9ff; text-decoration: none;">support.hostelbuddy.help@gmail.com</a></p>
  </div>
`;

const wrapEmail = (headerGradient, headerEmoji, headerTitle, bodyHtml) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    ${buildHeader(headerGradient, headerEmoji, headerTitle)}
    <div class="content">
      ${bodyHtml}
    </div>
    ${buildFooter()}
  </div>
</body>
</html>
`;


// ────────────────────────────────────────────────────────
// 1. Invoice Email (existing)
// ────────────────────────────────────────────────────────

const getInvoiceEmailContent = (ownerName, hostelName, amount, expiryDate) => {
  const safeOwner = escapeHtml(ownerName);
  const safeHostel = escapeHtml(hostelName);
  const body = `
    <h1>Payment Successful! 🎉</h1>
    <p>Dear <strong>${safeOwner}</strong>,</p>
    <p>Thank you for subscribing and trusting HostelBuddy! Your listing for <strong>${safeHostel}</strong> is now live and fully active on our platform.</p>
    
    <div style="background: #fdfbfb; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <div class="info-row">
        <span class="info-label">Listing:</span>
        <span class="info-value">${safeHostel}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Valid Until:</span>
        <span class="info-value">${new Date(expiryDate).toDateString()}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Total Paid:</span>
        <span class="info-value" style="color: #FF6B6B; font-weight: 700;">₹${amount}</span>
      </div>
    </div>

    <p>We are thrilled to have you onboard. Manage your listing seamlessly from your dashboard.</p>
  `;
  return wrapEmail('#FF6B6B 0%, #FF8E53 100%', '🎉', 'Payment Confirmation', body);
};


// ────────────────────────────────────────────────────────
// 2. Renewal Reminder Email (existing)
// ────────────────────────────────────────────────────────

const getReminderEmailContent = (ownerName, hostelName, daysLeft) => {
  const safeOwner = escapeHtml(ownerName);
  const safeHostel = escapeHtml(hostelName);
  const body = `
    <h1>Action Required: Renew Subscription ⏰</h1>
    <p>Dear <strong>${safeOwner}</strong>,</p>
    <p>Your subscription for the listing <strong>${safeHostel}</strong> is going to expire soon.</p>
    
    <div style="background: #fff3cd; border: 1px solid #ffeeba; border-radius: 8px; padding: 15px; margin: 20px 0; color: #856404; font-weight: bold; text-align: center; font-size: 16px;">
      ⚠️ Only ${daysLeft} day${daysLeft > 1 ? 's' : ''} left until your listing expires!
    </div>

    <p>To ensure uninterrupted visibility of your hostel to thousands of students, please renew your subscription as soon as possible via your dashboard.</p>
    <p>If your listing expires, it will be hidden from search results, which might lead to fewer inquiries.</p>
  `;
  return wrapEmail('#fbc531 0%, #e1b12c 100%', '⏰', 'Subscription Reminder', body);
};


// ────────────────────────────────────────────────────────
// 3. New Enquiry → Email to Owner
// ────────────────────────────────────────────────────────

const getNewEnquiryEmailContent = (ownerName, studentName, hostelName, messageText) => {
  const safeOwner = escapeHtml(ownerName);
  const safeStudent = escapeHtml(studentName);
  const safeHostel = escapeHtml(hostelName);
  const safeMessage = escapeHtml(messageText);
  const body = `
    <h1>New Enquiry Received 📩</h1>
    <p>Dear <strong>${safeOwner}</strong>,</p>
    <p>Great news! A student is interested in your hostel listing. Here are the details:</p>
    
    <div style="background: #fdfbfb; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <div class="info-row">
        <span class="info-label">Student Name:</span>
        <span class="info-value">${safeStudent}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Hostel:</span>
        <span class="info-value">${safeHostel}</span>
      </div>
    </div>

    <p style="font-weight: 600; color: #636e72; margin-bottom: 4px;">Student's Message:</p>
    <div class="message-box">
      "${safeMessage}"
    </div>

    <p>Log in to your HostelBuddy dashboard to view the full enquiry and respond to the student.</p>
    <p style="color: #6c5ce7; font-weight: 600;">💡 Quick responses increase your chances of booking!</p>
  `;
  return wrapEmail('#6c5ce7 0%, #a29bfe 100%', '📩', 'New Enquiry Alert', body);
};


// ────────────────────────────────────────────────────────
// 4. Enquiry Reply → Email to Student
// ────────────────────────────────────────────────────────

const getEnquiryReplyEmailContent = (studentName, hostelName, replyText) => {
  const safeStudent = escapeHtml(studentName);
  const safeHostel = escapeHtml(hostelName);
  const safeReply = escapeHtml(replyText);
  const body = `
    <h1>You Got a Reply! 💬</h1>
    <p>Dear <strong>${safeStudent}</strong>,</p>
    <p>The owner of <strong>${safeHostel}</strong> has responded to your enquiry. Here's what they said:</p>

    <p style="font-weight: 600; color: #636e72; margin-bottom: 4px;">Owner's Reply:</p>
    <div class="message-box">
      "${safeReply}"
    </div>

    <p>Head over to your HostelBuddy dashboard to continue the conversation and take the next step.</p>
    <p style="color: #00b894; font-weight: 600;">🏠 Your perfect hostel might be just one message away!</p>
  `;
  return wrapEmail('#00b894 0%, #00cec9 100%', '💬', 'Enquiry Reply', body);
};


// ────────────────────────────────────────────────────────
// 5. Chat Message → Email to Other Party
// ────────────────────────────────────────────────────────

const getNewChatMessageEmailContent = (recipientName, senderRole, senderName, hostelName, messageText) => {
  const safeRecipient = escapeHtml(recipientName);
  const safeSender = escapeHtml(senderName);
  const safeHostel = escapeHtml(hostelName);
  const safeMessage = escapeHtml(messageText);
  const roleEmoji = senderRole === 'Student' ? '🎓' : '🏠';
  const body = `
    <h1>New Message Received 💬</h1>
    <p>Dear <strong>${safeRecipient}</strong>,</p>
    <p>You have a new message in your enquiry conversation for <strong>${safeHostel}</strong>.</p>

    <div style="background: #fdfbfb; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <div class="info-row">
        <span class="info-label">From:</span>
        <span class="info-value">${roleEmoji} ${safeSender} (${senderRole})</span>
      </div>
      <div class="info-row">
        <span class="info-label">Hostel:</span>
        <span class="info-value">${safeHostel}</span>
      </div>
    </div>

    <p style="font-weight: 600; color: #636e72; margin-bottom: 4px;">Message:</p>
    <div class="message-box">
      "${safeMessage}"
    </div>

    <p>Log in to your HostelBuddy dashboard to reply and keep the conversation going.</p>
  `;
  return wrapEmail('#0984e3 0%, #74b9ff 100%', '💬', 'New Chat Message', body);
};


// ────────────────────────────────────────────────────────
// 6. Enquiry Status Change → Email to Student
// ────────────────────────────────────────────────────────

const getEnquiryStatusChangeEmailContent = (studentName, hostelName, newStatus) => {
  const safeStudent = escapeHtml(studentName);
  const safeHostel = escapeHtml(hostelName);
  let statusColor, statusBg, statusIcon, statusMessage;
  
  switch (newStatus) {
    case 'Responded':
      statusColor = '#00b894';
      statusBg = '#d4edda';
      statusIcon = '✅';
      statusMessage = 'The owner has responded to your enquiry. Check your dashboard for the full reply.';
      break;
    case 'Closed':
      statusColor = '#d63031';
      statusBg = '#f8d7da';
      statusIcon = '🔒';
      statusMessage = 'This enquiry has been closed by the owner. If you have further questions, feel free to send a new enquiry.';
      break;
    default:
      statusColor = '#fdcb6e';
      statusBg = '#fff3cd';
      statusIcon = '🔄';
      statusMessage = 'Your enquiry status has been updated. Visit your dashboard for more details.';
  }

  const gradient = newStatus === 'Closed' ? '#d63031 0%, #e17055 100%' : '#00b894 0%, #55efc4 100%';

  const body = `
    <h1>Enquiry Status Updated ${statusIcon}</h1>
    <p>Dear <strong>${safeStudent}</strong>,</p>
    <p>Your enquiry for <strong>${safeHostel}</strong> has a status update:</p>

    <div style="text-align: center; margin: 25px 0;">
      <span class="status-badge" style="background: ${statusBg}; color: ${statusColor};">
        ${statusIcon} ${newStatus}
      </span>
    </div>

    <p>${statusMessage}</p>

    <p>Visit your HostelBuddy dashboard to view the complete details.</p>
  `;
  return wrapEmail(gradient, statusIcon, 'Enquiry Status Update', body);
};


// ────────────────────────────────────────────────────────
// 7. Admin Notification → Email to Owner/Student
// ────────────────────────────────────────────────────────

const getAdminNotificationEmailContent = (recipientName, adminMessage, notificationType) => {
  const safeRecipient = escapeHtml(recipientName);
  const safeAdminMsg = escapeHtml(adminMessage);
  let typeColor, typeIcon;
  
  switch (notificationType) {
    case 'success':
      typeColor = '#00b894';
      typeIcon = '✅';
      break;
    case 'warning':
      typeColor = '#fdcb6e';
      typeIcon = '⚠️';
      break;
    case 'danger':
      typeColor = '#d63031';
      typeIcon = '🚨';
      break;
    default:
      typeColor = '#0984e3';
      typeIcon = '📢';
  }

  const body = `
    <h1>Message from HostelBuddy Admin ${typeIcon}</h1>
    <p>Dear <strong>${safeRecipient}</strong>,</p>
    <p>The HostelBuddy admin team has sent you an important message:</p>

    <div class="message-box" style="border-left-color: ${typeColor};">
      "${safeAdminMsg}"
    </div>

    <p>If you have any questions or concerns, please reach out through the HostelBuddy platform.</p>
    <p style="color: ${typeColor}; font-weight: 600;">Your attention to this matter is appreciated.</p>
  `;
  return wrapEmail('#2d3436 0%, #636e72 100%', typeIcon, 'Admin Notification', body);
};


// ────────────────────────────────────────────────────────
// 8. Hostel Approval → Email to Owner
// ────────────────────────────────────────────────────────

const getHostelApprovalEmailContent = (ownerName, hostelName, isApproved) => {
  const safeOwner = escapeHtml(ownerName);
  const safeHostel = escapeHtml(hostelName);
  const statusIcon = isApproved ? '✅' : '❌';
  const statusText = isApproved ? 'Approved' : 'Unapproved';
  const gradient = isApproved ? '#00b894 0%, #55efc4 100%' : '#d63031 0%, #e17055 100%';
  const statusBg = isApproved ? '#d4edda' : '#f8d7da';
  const statusColor = isApproved ? '#00b894' : '#d63031';

  const approvedMessage = `
    <p>Congratulations! Your hostel is now <strong>live on HostelBuddy</strong> and visible to thousands of students searching for accommodation.</p>
    <p style="color: #00b894; font-weight: 600;">🎯 Make sure your listing details are up-to-date to attract more students!</p>
  `;

  const unapprovedMessage = `
    <p>Your hostel listing has been temporarily removed from public visibility. This may have been done for review or compliance purposes.</p>
    <p>Please check your dashboard or contact admin if you believe this was done in error.</p>
  `;

  const body = `
    <h1>Hostel Listing ${statusText} ${statusIcon}</h1>
    <p>Dear <strong>${safeOwner}</strong>,</p>
    <p>Your hostel listing <strong>"${safeHostel}"</strong> has been reviewed by our admin team:</p>

    <div style="text-align: center; margin: 25px 0;">
      <span class="status-badge" style="background: ${statusBg}; color: ${statusColor};">
        ${statusIcon} ${statusText}
      </span>
    </div>

    ${isApproved ? approvedMessage : unapprovedMessage}
  `;
  return wrapEmail(gradient, statusIcon, `Listing ${statusText}`, body);
};


// ────────────────────────────────────────────────────────
// 9. Account Verification → Email to Owner
// ────────────────────────────────────────────────────────

const getVerificationEmailContent = (ownerName, verificationStatus) => {
  const safeOwner = escapeHtml(ownerName);
  const isVerified = verificationStatus === 'verified';
  const statusIcon = isVerified ? '🛡️' : '❌';
  const statusText = isVerified ? 'Verified' : 'Rejected';
  const gradient = isVerified ? '#6c5ce7 0%, #a29bfe 100%' : '#d63031 0%, #e17055 100%';
  const statusBg = isVerified ? '#e8daef' : '#f8d7da';
  const statusColor = isVerified ? '#6c5ce7' : '#d63031';

  const verifiedMessage = `
    <p>Your identity has been successfully verified! You now have a <strong>verified badge</strong> on your profile and listings, which builds trust with students browsing HostelBuddy.</p>
    <p style="color: #6c5ce7; font-weight: 600;">🌟 Verified owners receive 3x more enquiries on average!</p>
  `;

  const rejectedMessage = `
    <p>Unfortunately, we were unable to verify your identity based on the documents provided. Please ensure your documents are clear, valid, and match the information on your profile.</p>
    <p>You can re-submit your verification request from your dashboard at any time.</p>
  `;

  const body = `
    <h1>Account Verification ${statusText} ${statusIcon}</h1>
    <p>Dear <strong>${safeOwner}</strong>,</p>
    <p>Your account verification request has been reviewed by our admin team:</p>

    <div style="text-align: center; margin: 25px 0;">
      <span class="status-badge" style="background: ${statusBg}; color: ${statusColor};">
        ${statusIcon} ${statusText}
      </span>
    </div>

    ${isVerified ? verifiedMessage : rejectedMessage}
  `;
  return wrapEmail(gradient, statusIcon, `Verification ${statusText}`, body);
};


// ────────────────────────────────────────────────────────
// 10. Platform Update Broadcast → Email to Students/Owners
// ────────────────────────────────────────────────────────

const getPlatformUpdateEmailContent = (recipientName, updateTitle, updateMessage, targetRole) => {
  const safeRecipient = escapeHtml(recipientName);
  const safeTitle = escapeHtml(updateTitle);
  const safeMessage = escapeHtml(updateMessage);
  
  const audienceLabel = targetRole === 'All' ? 'All Users' : `${targetRole}s`;

  const body = `
    <h1>📢 Platform Update</h1>
    <p>Dear <strong>${safeRecipient}</strong>,</p>
    <p>We have an important announcement from the HostelBuddy team:</p>

    <div style="background: #fdfbfb; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h2 style="color: #2d3436; font-size: 18px; margin: 0 0 10px 0;">📌 ${safeTitle}</h2>
      <p style="color: #555; margin: 0; line-height: 1.7;">${safeMessage}</p>
    </div>

    <div style="text-align: center; margin: 15px 0;">
      <span class="status-badge" style="background: #dfe6e9; color: #636e72;">
        🎯 Sent to: ${audienceLabel}
      </span>
    </div>

    <p>Log in to your HostelBuddy dashboard for more details and to stay up-to-date with the latest features.</p>
    <p style="color: #6c5ce7; font-weight: 600;">🚀 Thank you for being part of the HostelBuddy community!</p>
  `;
  return wrapEmail('#6c5ce7 0%, #a29bfe 100%', '📢', 'Platform Announcement', body);
};



// ────────────────────────────────────────────────────────
// 11. Welcome Email → Sent after Email Verification
// ────────────────────────────────────────────────────────

const getWelcomeEmailContent = (userName, userRole) => {
  const safeName = escapeHtml(userName);

  const studentGuide = `
    <div style="margin: 25px 0;">
      <h2 style="color: #2d3436; font-size: 18px; margin-bottom: 15px;">🚀 Your Quick Start Guide</h2>
      <p style="color: #636e72; margin-bottom: 20px;">Here's everything you can do on HostelBuddy as a Student:</p>
      
      <div style="background: #f8f9fa; border-radius: 10px; padding: 20px; margin-bottom: 10px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td style="padding: 14px 16px; border-bottom: 1px solid #e9ecef;">
              <span style="background: #dfe6e9; border-radius: 50%; width: 28px; height: 28px; display: inline-block; text-align: center; line-height: 28px; font-weight: 700; font-size: 13px; color: #2d3436; margin-right: 12px;">1</span>
              <strong style="color: #2d3436;">🔍 Browse Hostels</strong>
              <p style="margin: 6px 0 0 40px; color: #636e72; font-size: 14px;">Search & filter properties by city, price range, and amenities to find your perfect stay.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 16px; border-bottom: 1px solid #e9ecef;">
              <span style="background: #dfe6e9; border-radius: 50%; width: 28px; height: 28px; display: inline-block; text-align: center; line-height: 28px; font-weight: 700; font-size: 13px; color: #2d3436; margin-right: 12px;">2</span>
              <strong style="color: #2d3436;">❤️ Save Favorites</strong>
              <p style="margin: 6px 0 0 40px; color: #636e72; font-size: 14px;">Bookmark hostels you love to compare them later from your Saved Hostels tab.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 16px; border-bottom: 1px solid #e9ecef;">
              <span style="background: #dfe6e9; border-radius: 50%; width: 28px; height: 28px; display: inline-block; text-align: center; line-height: 28px; font-weight: 700; font-size: 13px; color: #2d3436; margin-right: 12px;">3</span>
              <strong style="color: #2d3436;">📩 Send Enquiries</strong>
              <p style="margin: 6px 0 0 40px; color: #636e72; font-size: 14px;">Directly message any hostel owner with your questions about pricing, availability, or rules.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 16px; border-bottom: 1px solid #e9ecef;">
              <span style="background: #dfe6e9; border-radius: 50%; width: 28px; height: 28px; display: inline-block; text-align: center; line-height: 28px; font-weight: 700; font-size: 13px; color: #2d3436; margin-right: 12px;">4</span>
              <strong style="color: #2d3436;">💬 Chat with Owners</strong>
              <p style="margin: 6px 0 0 40px; color: #636e72; font-size: 14px;">Continue real-time conversations with owners and get quick responses to your queries.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 16px; border-bottom: 1px solid #e9ecef;">
              <span style="background: #dfe6e9; border-radius: 50%; width: 28px; height: 28px; display: inline-block; text-align: center; line-height: 28px; font-weight: 700; font-size: 13px; color: #2d3436; margin-right: 12px;">5</span>
              <strong style="color: #2d3436;">⭐ Leave Reviews</strong>
              <p style="margin: 6px 0 0 40px; color: #636e72; font-size: 14px;">Rate and review hostels you've visited to help other students make informed decisions.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 16px;">
              <span style="background: #dfe6e9; border-radius: 50%; width: 28px; height: 28px; display: inline-block; text-align: center; line-height: 28px; font-weight: 700; font-size: 13px; color: #2d3436; margin-right: 12px;">6</span>
              <strong style="color: #2d3436;">👤 Complete Your Profile</strong>
              <p style="margin: 6px 0 0 40px; color: #636e72; font-size: 14px;">Add college details, parent contacts, and government ID to build trust with hostel owners.</p>
            </td>
          </tr>
        </table>
      </div>
    </div>
  `;

  const ownerGuide = `
    <div style="margin: 25px 0;">
      <h2 style="color: #2d3436; font-size: 18px; margin-bottom: 15px;">🚀 Your Quick Start Guide</h2>
      <p style="color: #636e72; margin-bottom: 20px;">Here's everything you can do on HostelBuddy as an Owner:</p>
      
      <div style="background: #f8f9fa; border-radius: 10px; padding: 20px; margin-bottom: 10px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td style="padding: 14px 16px; border-bottom: 1px solid #e9ecef;">
              <span style="background: #dfe6e9; border-radius: 50%; width: 28px; height: 28px; display: inline-block; text-align: center; line-height: 28px; font-weight: 700; font-size: 13px; color: #2d3436; margin-right: 12px;">1</span>
              <strong style="color: #2d3436;">✅ Get Verified</strong>
              <p style="margin: 6px 0 0 40px; color: #636e72; font-size: 14px;">Submit your identity documents for a verified badge — verified owners get 3x more enquiries!</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 16px; border-bottom: 1px solid #e9ecef;">
              <span style="background: #dfe6e9; border-radius: 50%; width: 28px; height: 28px; display: inline-block; text-align: center; line-height: 28px; font-weight: 700; font-size: 13px; color: #2d3436; margin-right: 12px;">2</span>
              <strong style="color: #2d3436;">🏠 List Your Property</strong>
              <p style="margin: 6px 0 0 40px; color: #636e72; font-size: 14px;">Add high-quality photos, set pricing, describe amenities, and define house rules to attract students.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 16px; border-bottom: 1px solid #e9ecef;">
              <span style="background: #dfe6e9; border-radius: 50%; width: 28px; height: 28px; display: inline-block; text-align: center; line-height: 28px; font-weight: 700; font-size: 13px; color: #2d3436; margin-right: 12px;">3</span>
              <strong style="color: #2d3436;">💳 Activate Subscription</strong>
              <p style="margin: 6px 0 0 40px; color: #636e72; font-size: 14px;">Pay ₹299/month via Razorpay to make your listing live and visible to thousands of students.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 16px; border-bottom: 1px solid #e9ecef;">
              <span style="background: #dfe6e9; border-radius: 50%; width: 28px; height: 28px; display: inline-block; text-align: center; line-height: 28px; font-weight: 700; font-size: 13px; color: #2d3436; margin-right: 12px;">4</span>
              <strong style="color: #2d3436;">📩 Manage Enquiries</strong>
              <p style="margin: 6px 0 0 40px; color: #636e72; font-size: 14px;">Respond to student messages, update enquiry status, and use bulk actions to stay organized.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 16px; border-bottom: 1px solid #e9ecef;">
              <span style="background: #dfe6e9; border-radius: 50%; width: 28px; height: 28px; display: inline-block; text-align: center; line-height: 28px; font-weight: 700; font-size: 13px; color: #2d3436; margin-right: 12px;">5</span>
              <strong style="color: #2d3436;">📊 Track Performance</strong>
              <p style="margin: 6px 0 0 40px; color: #636e72; font-size: 14px;">Monitor hostel views, enquiry counts, subscription status, and listing health from your dashboard.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px 16px;">
              <span style="background: #dfe6e9; border-radius: 50%; width: 28px; height: 28px; display: inline-block; text-align: center; line-height: 28px; font-weight: 700; font-size: 13px; color: #2d3436; margin-right: 12px;">6</span>
              <strong style="color: #2d3436;">🔔 Stay Updated</strong>
              <p style="margin: 6px 0 0 40px; color: #636e72; font-size: 14px;">Get instant email notifications for new enquiries, admin messages, and subscription reminders.</p>
            </td>
          </tr>
        </table>
      </div>
    </div>
  `;

  const guide = userRole === 'Owner' ? ownerGuide : studentGuide;
  const roleLabel = userRole === 'Owner' ? 'Hostel Owner' : 'Student';
  const dashboardPath = userRole === 'Owner' ? 'owner-dashboard.html' : 'student-dashboard.html';

  const body = `
    <h1>Welcome to HostelBuddy! 🎊</h1>
    <p>Hey <strong>${safeName}</strong>,</p>
    <p>We're thrilled to have you on board as a <strong>${roleLabel}</strong>! Your account is now fully activated and ready to go.</p>
    <p>HostelBuddy is your one-stop platform for ${userRole === 'Owner' ? 'listing and managing your hostel properties to reach thousands of students' : 'discovering, comparing, and connecting with the best hostels and PGs near your college'}.</p>

    ${guide}

    <div style="text-align: center; margin: 30px 0;">
      <a href="${dashboardPath}" style="display: inline-block; background: linear-gradient(135deg, #6c5ce7, #a29bfe); color: white; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-weight: 700; font-size: 15px; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(108, 92, 231, 0.3);">Go to Your Dashboard →</a>
    </div>

    <p style="color: #636e72;">If you have any questions or need help getting started, don't hesitate to reach out to our support team. We're always here to help! 💪</p>
    <p style="color: #6c5ce7; font-weight: 600;">🌟 Welcome to the HostelBuddy family!</p>
  `;

  return wrapEmail('#00b894 0%, #00cec9 100%', '🎉', 'Welcome to HostelBuddy!', body);
};


// ────────────────────────────────────────────────────────
// 12. Come Back Email → Sent when user inactive 2+ days
// ────────────────────────────────────────────────────────

const getComebackEmailContent = (userName, userRole, stats) => {
  const safeName = escapeHtml(userName);
  const hasActivity = (stats.unreadEnquiries > 0) || (stats.unreadNotifications > 0) || (stats.newViews > 0);

  let activitySection = '';

  if (hasActivity) {
    activitySection = `
      <p>While you were away, some things happened on your account:</p>
      <div style="background: #f8f9fa; border-radius: 10px; padding: 20px; margin: 20px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          ${stats.unreadEnquiries > 0 ? `
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e9ecef;">
              <span style="font-size: 20px; margin-right: 12px;">📩</span>
              <strong style="color: #2d3436;">${stats.unreadEnquiries} unread enquir${stats.unreadEnquiries === 1 ? 'y' : 'ies'}</strong>
              <span style="color: #636e72;"> waiting for your response</span>
            </td>
          </tr>` : ''}
          ${stats.unreadNotifications > 0 ? `
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e9ecef;">
              <span style="font-size: 20px; margin-right: 12px;">🔔</span>
              <strong style="color: #2d3436;">${stats.unreadNotifications} unread notification${stats.unreadNotifications === 1 ? '' : 's'}</strong>
              <span style="color: #636e72;"> you haven't seen yet</span>
            </td>
          </tr>` : ''}
          ${stats.newViews > 0 ? `
          <tr>
            <td style="padding: 12px 16px;">
              <span style="font-size: 20px; margin-right: 12px;">👀</span>
              <strong style="color: #2d3436;">${stats.newViews} new view${stats.newViews === 1 ? '' : 's'}</strong>
              <span style="color: #636e72;"> on your hostel listing${stats.totalHostels > 1 ? 's' : ''}</span>
            </td>
          </tr>` : ''}
        </table>
      </div>
      <p style="color: #e17055; font-weight: 600;">⏰ Don't keep them waiting — quick responses lead to better outcomes!</p>
    `;
  } else {
    const tipMessage = userRole === 'Owner'
      ? 'Students are actively searching for hostels every day! Make sure your listing details, photos, and pricing are up-to-date to attract more enquiries.'
      : 'New hostels are being listed every day! Come explore the latest options near your college and find your perfect stay.';

    activitySection = `
      <div style="background: #ffeaa7; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="font-size: 28px; margin: 0 0 10px 0;">🌟</p>
        <p style="color: #2d3436; font-weight: 600; margin: 0 0 8px 0;">Here's a tip for you!</p>
        <p style="color: #636e72; margin: 0; font-size: 14px; line-height: 1.6;">${tipMessage}</p>
      </div>
    `;
  }

  const dashboardPath = userRole === 'Owner' ? 'owner-dashboard.html' : 'student-dashboard.html';

  const body = `
    <h1>We Miss You! 👋</h1>
    <p>Hey <strong>${safeName}</strong>,</p>
    <p>It's been a while since you last visited HostelBuddy. We just wanted to check in and let you know what's been happening.</p>

    ${activitySection}

    <div style="text-align: center; margin: 30px 0;">
      <a href="${dashboardPath}" style="display: inline-block; background: linear-gradient(135deg, #e17055, #fdcb6e); color: white; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-weight: 700; font-size: 15px; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(225, 112, 85, 0.3);">Come Back to HostelBuddy →</a>
    </div>

    <p style="color: #636e72;">We're constantly adding new features and improving the platform to give you the best experience. Log in and see what's new! 🚀</p>
  `;

  return wrapEmail('#e17055 0%, #fdcb6e 100%', '👋', 'We Miss You!', body);
};


// ────────────────────────────────────────────────────────
// 13. Milestone Celebration Email → Achievement unlocked
// ────────────────────────────────────────────────────────

const getMilestoneEmailContent = (userName, milestoneType, milestoneValue) => {
  const safeName = escapeHtml(userName);

  let milestoneIcon, milestoneTitle, milestoneMessage, motivationalTip;

  switch (milestoneType) {
    case 'first_enquiry_student':
      milestoneIcon = '🎯';
      milestoneTitle = 'First Enquiry Sent!';
      milestoneMessage = 'You\'ve taken the first step towards finding your perfect hostel! The owner will receive your message and get back to you soon.';
      motivationalTip = 'Send enquiries to multiple hostels to compare options and find the best deal!';
      break;
    case 'first_enquiry_owner':
      milestoneIcon = '📩';
      milestoneTitle = 'First Enquiry Received!';
      milestoneMessage = 'A student is interested in your property! Your first enquiry is a big milestone — it means your listing is getting noticed.';
      motivationalTip = 'Quick responses increase your booking chances by 80%. Head to your dashboard to reply!';
      break;
    case 'enquiry_milestone_student':
      milestoneIcon = '🔥';
      milestoneTitle = `${milestoneValue} Enquiries Sent!`;
      milestoneMessage = `Wow, you've sent ${milestoneValue} enquiries! You're really doing your research — that's the smart way to find the best hostel.`;
      motivationalTip = 'Check your enquiries tab to follow up on responses and make your final decision!';
      break;
    case 'enquiry_milestone_owner':
      milestoneIcon = '🔥';
      milestoneTitle = `${milestoneValue} Enquiries Received!`;
      milestoneMessage = `Incredible! Your property has attracted ${milestoneValue} enquiries. Your listing is clearly standing out on HostelBuddy!`;
      motivationalTip = 'Keep your listing updated with fresh photos and accurate pricing to maintain this momentum!';
      break;
    case 'views_milestone':
      milestoneIcon = '👀';
      milestoneTitle = `${milestoneValue} Hostel Views!`;
      milestoneMessage = `Your hostel listing has been viewed ${milestoneValue} times! That's amazing visibility on the platform.`;
      motivationalTip = 'More views = more potential bookings. Ensure your photos are high-quality and description is compelling!';
      break;
    case 'first_review':
      milestoneIcon = '⭐';
      milestoneTitle = 'First Review Received!';
      milestoneMessage = 'A student left a review on your hostel! Reviews build trust and help other students make informed decisions.';
      motivationalTip = 'Encourage satisfied students to leave reviews — properties with 5+ reviews get significantly more enquiries!';
      break;
    default:
      milestoneIcon = '🏆';
      milestoneTitle = 'Achievement Unlocked!';
      milestoneMessage = 'You\'ve reached a new milestone on HostelBuddy. Keep up the great work!';
      motivationalTip = 'Stay active on the platform to unlock more achievements and grow your presence!';
  }

  const body = `
    <h1>Achievement Unlocked! 🏆</h1>
    <p>Hey <strong>${safeName}</strong>,</p>
    <p>We have some exciting news for you!</p>

    <div style="text-align: center; margin: 30px 0;">
      <div style="background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%); border-radius: 16px; padding: 30px; display: inline-block; min-width: 280px;">
        <p style="font-size: 48px; margin: 0 0 10px 0;">${milestoneIcon}</p>
        <h2 style="color: #2d3436; font-size: 20px; margin: 0 0 10px 0;">${milestoneTitle}</h2>
        <p style="color: #636e72; margin: 0; font-size: 14px; line-height: 1.6;">${milestoneMessage}</p>
      </div>
    </div>

    <div style="background: #f0f7ff; border-left: 4px solid #0984e3; border-radius: 6px; padding: 16px 20px; margin: 20px 0;">
      <p style="margin: 0; color: #0984e3; font-weight: 600; font-size: 14px;">💡 Pro Tip</p>
      <p style="margin: 8px 0 0 0; color: #555; font-size: 14px;">${motivationalTip}</p>
    </div>

    <p style="color: #636e72;">Keep up the amazing work on HostelBuddy! Every milestone brings you closer to your goal. 💪</p>
    <p style="color: #6c5ce7; font-weight: 600;">🌟 We're proud to have you in the HostelBuddy community!</p>
  `;

  return wrapEmail('#f9ca24 0%, #f0932b 100%', '🏆', 'Achievement Unlocked!', body);
};


module.exports = {
  getInvoiceEmailContent,
  getReminderEmailContent,
  getNewEnquiryEmailContent,
  getEnquiryReplyEmailContent,
  getNewChatMessageEmailContent,
  getEnquiryStatusChangeEmailContent,
  getAdminNotificationEmailContent,
  getHostelApprovalEmailContent,
  getVerificationEmailContent,
  getPlatformUpdateEmailContent,
  getWelcomeEmailContent,
  getComebackEmailContent,
  getMilestoneEmailContent
};
