const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  otp: { type: String, required: true },
  generatedAt: { type: Date, required: true, default: Date.now },
  attempts: { type: Number, required: true, default: 0, min: 0, max: 3 },
});

// TTL index: auto-delete records 60 seconds after generatedAt (data cleanup, not authoritative expiry)
otpSchema.index({ generatedAt: 1 }, { expireAfterSeconds: 60 });

module.exports = mongoose.model('Otp', otpSchema);
