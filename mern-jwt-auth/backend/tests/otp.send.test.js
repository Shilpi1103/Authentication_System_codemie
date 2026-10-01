process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mern-jwt-auth-test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

jest.mock('../config/mailer', () => ({
  transporter: { sendMail: jest.fn() },
  buildOtpMailOptions: (email, otp) => ({
    to: email,
    from: 'no-reply@example.com',
    subject: 'Your OTP Code',
    text: `Your OTP is ${otp}. It is valid for 60 seconds.`,
  }),
}));

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { transporter } = require('../config/mailer');
const authRoutes = require('../routes/authRoutes');
const User = require('../models/User');
const Otp = require('../models/Otp');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  await mongoose.connection.close();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Otp.deleteMany({});
  transporter.sendMail.mockReset();
  transporter.sendMail.mockResolvedValue({ accepted: [true] });
});

describe('POST /api/auth/otp/send', () => {
  test('registered email -> HTTP 200 + OTP record persisted with attempts 0 (AC-001)', async () => {
    const user = await User.create({ name: 'Jane', email: 'jane1@example.com', password: 'hashedpw' });

    const res = await request(app).post('/api/auth/otp/send').send({ email: user.email });

    expect(res.status).toBe(200);
    const record = await Otp.findOne({ email: user.email });
    expect(record).not.toBeNull();
    expect(record.attempts).toBe(0);
  });

  test('unregistered email -> HTTP 404, no record, no mail sent (AC-002)', async () => {
    const res = await request(app).post('/api/auth/otp/send').send({ email: 'nouser@example.com' });

    expect(res.status).toBe(404);
    const record = await Otp.findOne({ email: 'nouser@example.com' });
    expect(record).toBeNull();
    expect(transporter.sendMail).not.toHaveBeenCalled();
  });

  test('OTP value is a 4-character zero-padded digit string (AC-003)', async () => {
    const user = await User.create({ name: 'Jane', email: 'jane2@example.com', password: 'hashedpw' });

    await request(app).post('/api/auth/otp/send').send({ email: user.email });

    const record = await Otp.findOne({ email: user.email });
    expect(record.otp).toMatch(/^\d{4}$/);
  });

  test('sendMail invoked with the OTP in the body (AC-005)', async () => {
    const user = await User.create({ name: 'Jane', email: 'jane3@example.com', password: 'hashedpw' });

    await request(app).post('/api/auth/otp/send').send({ email: user.email });

    const record = await Otp.findOne({ email: user.email });
    const callArgs = transporter.sendMail.mock.calls[0][0];
    expect(callArgs.text).toContain(record.otp);
    expect(callArgs.subject).toBeTruthy();
    expect(callArgs.from).toBeTruthy();
  });

  test('4th request within 10 minutes for the same email -> HTTP 429 (AC-006, AC-007)', async () => {
    const user = await User.create({ name: 'Jane', email: 'jane4@example.com', password: 'hashedpw' });

    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const okRes = await request(app).post('/api/auth/otp/send').send({ email: user.email });
      expect(okRes.status).toBe(200);
    }

    const res = await request(app).post('/api/auth/otp/send').send({ email: user.email });
    expect(res.status).toBe(429);
  });

  test('SMTP throw -> HTTP 500 and no OTP record persisted (AC-024)', async () => {
    const user = await User.create({ name: 'Jane', email: 'jane5@example.com', password: 'hashedpw' });
    transporter.sendMail.mockRejectedValueOnce(new Error('SMTP timeout'));

    const res = await request(app).post('/api/auth/otp/send').send({ email: user.email });

    expect(res.status).toBe(500);
    const record = await Otp.findOne({ email: user.email });
    expect(record).toBeNull();
  });

  test('malformed email -> HTTP 400 (AC-026 subset for sendOtp)', async () => {
    const res = await request(app).post('/api/auth/otp/send').send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(transporter.sendMail).not.toHaveBeenCalled();
  });
});
