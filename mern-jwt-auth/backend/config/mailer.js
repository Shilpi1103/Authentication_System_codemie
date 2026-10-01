const nodemailer = require('nodemailer');

const EMAIL_TIMEOUT_MS = Number(process.env.EMAIL_TIMEOUT_MS) || 10_000;

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Mandatory overrides of NodeMailer's defaults (2 min / 30 s / 1 min) so a
  // non-responding SMTP server fails fast instead of holding the request open.
  connectionTimeout: EMAIL_TIMEOUT_MS,
  greetingTimeout: EMAIL_TIMEOUT_MS,
  socketTimeout: EMAIL_TIMEOUT_MS,
});

transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP connection failed:", error);
  } else {
    console.log("SMTP server is ready");
  }
});

// Builds the sendMail options for an OTP email (subject/from/readable body per M-003).
const buildOtpMailOptions = (email, otp) => ({
  to: email,
  from: process.env.EMAIL_USER,
  subject: 'Your OTP Code',
  text: `Your OTP is ${otp}. It is valid for 60 seconds.`,
});

module.exports = { transporter, buildOtpMailOptions };
