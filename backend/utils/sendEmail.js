const nodemailer = require('nodemailer');
const dns = require('dns');

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

// Create a single persistent transporter with connection pooling
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_PORT == 465 ? true : false,
  requireTLS: process.env.EMAIL_PORT != 465 ? true : false,
  pool: true,         // Enable connection pooling
  maxConnections: 5,
  maxMessages: 100,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  family: 4, // Force IPv4
  tls: {
    rejectUnauthorized: false
  }
});

transporter.on('error', (err) => {
  console.error('Nodemailer Transporter Error:', err);
});

const sendEmail = async (options) => {
  const message = {
    from: `${process.env.FROM_NAME || 'Hostel Buddy'} <${process.env.FROM_EMAIL || process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html
  };

  await transporter.sendMail(message);
};

module.exports = sendEmail;
