const nodemailer = require('nodemailer');
const dns = require('dns');

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587, 
    secure: process.env.EMAIL_PORT == 465 ? true : false, 
    requireTLS: process.env.EMAIL_PORT != 465 ? true : false,
    // Do NOT use predefined 'service', because it can override IPv4 enforcements
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    // Force Node's net.connect to use IPv4 only (value 4 means IPv4)
    family: 4, 
    tls: {
      rejectUnauthorized: false
    }
  });

  transporter.on('error', (err) => {
    console.error('Nodemailer Transporter Error:', err);
  });

  const message = {
    from: `${process.env.FROM_NAME || 'Hostel Buddy'} <${process.env.FROM_EMAIL || process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html
  };

  await transporter.sendMail(message);
};

module.exports = sendEmail;
