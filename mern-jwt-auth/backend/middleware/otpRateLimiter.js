// In-process per-email OTP generation rate limit: max 3 requests / 10 minutes (AD-002).
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 3;

const requestCounts = new Map();

const otpRateLimiter = (req, res, next) => {
  const email = typeof req.body.email === 'string' ? req.body.email.toLowerCase().trim() : '';
  const now = Date.now();
  const entry = requestCounts.get(email);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    requestCounts.set(email, { count: 1, windowStart: now });
    return next();
  }

  if (entry.count >= MAX_REQUESTS) {
    return res.status(429).json({ message: 'Too many OTP requests. Please try again in 10 minutes.' });
  }

  entry.count += 1;
  next();
};

module.exports = otpRateLimiter;
