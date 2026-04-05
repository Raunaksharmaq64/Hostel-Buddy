const HOSTEL_BUDDY_LOGO = 'https://cdn-icons-png.flaticon.com/512/3030/3030336.png'; // Example placeholder logo (you can update this with your actual logo URL)

const getInvoiceEmailContent = (ownerName, hostelName, amount, expiryDate) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
      .header { background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); padding: 30px 20px; text-align: center; color: white; }
      .header img { max-width: 80px; margin-bottom: 10px; }
      .content { padding: 40px 30px; color: #333; line-height: 1.6; }
      .content h1 { color: #2d3436; font-size: 24px; margin-bottom: 20px; }
      .invoice-box { background: #fdfbfb; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0; }
      .invoice-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 16px; border-bottom: 1px dashed #e9ecef; padding-bottom: 10px; }
      .invoice-row:last-child { border-bottom: none; padding-bottom: 0; font-weight: bold; color: #FF6B6B; font-size: 18px; }
      .footer { background: #2d3436; color: #b2bec3; text-align: center; padding: 20px; font-size: 14px; }
      .btn { display: inline-block; padding: 12px 25px; background: #FF6B6B; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <img src="${HOSTEL_BUDDY_LOGO}" alt="HostelBuddy Logo" />
        <h2>HostelBuddy</h2>
      </div>
      <div class="content">
        <h1>Payment Successful! 🎉</h1>
        <p>Dear <strong>${ownerName}</strong>,</p>
        <p>Thank you for subscribing and trusting HostelBuddy! Your listing for <strong>${hostelName}</strong> is now live and fully active on our platform.</p>
        
        <div class="invoice-box">
          <div class="invoice-row">
            <span>Listing:</span>
            <span>${hostelName}</span>
          </div>
          <div class="invoice-row">
            <span>Valid Until:</span>
            <span>${new Date(expiryDate).toDateString()}</span>
          </div>
          <div class="invoice-row">
            <span>Total Paid Amount:</span>
            <span>₹${amount}</span>
          </div>
        </div>

        <p>We are thrilled to have you onboard. Manage your listing seamlessly from your dashboard.</p>
        
        <br/>
        <p>Warm Regards,</p>
        <p><strong>Raunak Sharma</strong><br/>Admin Controller, HostelBuddy</p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} HostelBuddy. All rights reserved.
      </div>
    </div>
  </body>
  </html>
  `;
};

const getReminderEmailContent = (ownerName, hostelName, daysLeft) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
      .header { background: linear-gradient(135deg, #fbc531 0%, #e1b12c 100%); padding: 30px 20px; text-align: center; color: white; }
      .header img { max-width: 80px; margin-bottom: 10px; }
      .content { padding: 40px 30px; color: #333; line-height: 1.6; }
      .content h1 { color: #2d3436; font-size: 24px; margin-bottom: 20px; }
      .alert-box { background: #fff3cd; border: 1px solid #ffeeba; border-radius: 8px; padding: 15px; margin: 20px 0; color: #856404; font-weight: bold; text-align: center; }
      .footer { background: #2d3436; color: #b2bec3; text-align: center; padding: 20px; font-size: 14px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <img src="${HOSTEL_BUDDY_LOGO}" alt="HostelBuddy Logo" />
        <h2>HostelBuddy</h2>
      </div>
      <div class="content">
        <h1>Action Required: Renew Subscription</h1>
        <p>Dear <strong>${ownerName}</strong>,</p>
        <p>Your subscription for the listing <strong>${hostelName}</strong> is going to expire soon.</p>
        
        <div class="alert-box">
          Only ${daysLeft} days left until your listing expires!
        </div>

        <p>To ensure uninterrupted visibility of your hostel to thousands of students, please renew your subscription as soon as possible via your dashboard.</p>
        <p>If your listing expires, it will be hidden from search results, which might lead to fewer inquiries.</p>
        
        <br/>
        <p>Warm Regards,</p>
        <p><strong>Raunak Sharma</strong><br/>Admin Controller, HostelBuddy</p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} HostelBuddy. All rights reserved.
      </div>
    </div>
  </body>
  </html>
  `;
};

module.exports = {
  getInvoiceEmailContent,
  getReminderEmailContent
};
