const crypto = require('crypto');
const User = require('../models/User');
const Otp = require('../models/Otp');
const generateToken = require('../utils/generateToken');
const { transporter, buildOtpMailOptions } = require('../config/mailer');

// RFC 5321-ish: local-part @ domain, no whitespace, max 254 chars (FR-021).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidEmail = (email) =>
  typeof email === 'string' && email.length <= 254 && EMAIL_REGEX.test(email);

// POST /api/auth/otp/send
const sendOtp = async (req, res) => {
  const rawEmail = req.body.email;

  if (!isValidEmail(rawEmail)) {
    return res.status(400).json({ message: 'Invalid email format.' });
  }
  const email = rawEmail.toLowerCase().trim();

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Email is not registered.' });
    }

    const otp = crypto.randomInt(0, 10000).toString().padStart(4, '0');

    try {
      await transporter.sendMail(buildOtpMailOptions(email, otp));
    } catch (mailError) {
      // NFR-006: no OTP value, no full email address in logs.
      console.error('[OTP] SMTP send failed for domain:', email.split('@')[1], mailError.message);
      return res.status(500).json({ message: 'Failed to send OTP email. Please try again.' });
    }

    try {
      // generatedAt omitted — schema default stamps it now, after confirmed SMTP delivery (AD-006).
      await Otp.findOneAndReplace({ email }, { email, otp, attempts: 0 }, { upsert: true, new: true });
    } catch (dbError) {
      if (dbError.code === 11000) {
        return res.status(429).json({ message: 'Too many OTP requests. Please try again in 10 minutes.' });
      }
      throw dbError;
    }

    return res.status(200).json({ message: 'OTP sent to your email.' });
  } catch (error) {
    console.error('[OTP] sendOtp server error:', error.message);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// POST /api/auth/otp/verify
const verifyOtp = async (req, res) => {
  const rawEmail = req.body.email;
  const otp = req.body.otp;

  if (!isValidEmail(rawEmail)) {
    return res.status(400).json({ message: 'Invalid email format.' });
  }
  const email = rawEmail.toLowerCase().trim();

  if (!/^\d{4}$/.test(otp)) {
    return res.status(400).json({ message: 'OTP must be exactly 4 digits.' });
  }

  try {
    const record = await Otp.findOneAndUpdate(
      { email, generatedAt: { $gt: new Date(Date.now() - 60_000) }, attempts: { $lt: 3 } },
      { $inc: { attempts: 1 } },
      { new: true }
    );

    if (!record) {
      return res.status(401).json({
        message: 'No active OTP found, or it has expired, or max attempts reached. Please request a new one.',
      });
    }

    if (record.otp !== otp) {
      if (record.attempts >= 3) {
        await Otp.deleteOne({ email });
        return res.status(401).json({ message: 'OTP has been invalidated after too many attempts. Please restart.' });
      }
      return res.status(401).json({ message: 'Incorrect OTP. Please try again.' });
    }

    await Otp.deleteOne({ email });
    const user = await User.findOne({ email });

    return res.status(200).json({
      message: 'Login successful.',
      token: generateToken(user._id),
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('[OTP] verifyOtp server error:', error.message);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

module.exports = { sendOtp, verifyOtp };
