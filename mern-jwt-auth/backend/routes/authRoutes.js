const express = require('express');
const router = express.Router();
const { register, login, getProfile } = require('../controllers/authController');
const { sendOtp, verifyOtp } = require('../controllers/otpController');
const { protect } = require('../middleware/authMiddleware');
const otpRateLimiter = require('../middleware/otpRateLimiter');

router.post('/register', register);
router.post('/login', login);
router.get('/profile', protect, getProfile);
router.post('/otp/send', sendOtp);
router.post('/otp/verify', verifyOtp);

module.exports = router;
