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
const jwt = require('jsonwebtoken');
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

describe('POST /api/auth/otp/verify', () => {
  test('correct OTP within 60s -> HTTP 200 with token + user, record deleted (AC-008)', async () => {
    const user = await User.create({ name: 'Jane', email: 'verify1@example.com', password: 'hashedpw' });
    await Otp.create({ email: user.email, otp: '1234', attempts: 0 });

    const res = await request(app).post('/api/auth/otp/verify').send({ email: user.email, otp: '1234' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({ name: 'Jane', email: user.email });
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.id).toBe(String(user._id));
    const record = await Otp.findOne({ email: user.email });
    expect(record).toBeNull();
  });

  test('incorrect OTP, attempts 0 or 1 -> HTTP 401 "Incorrect OTP", attempts incremented, record retained (AC-009)', async () => {
    const user = await User.create({ name: 'Jane', email: 'verify2@example.com', password: 'hashedpw' });
    await Otp.create({ email: user.email, otp: '1234', attempts: 0 });

    const res = await request(app).post('/api/auth/otp/verify').send({ email: user.email, otp: '9999' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/incorrect otp/i);
    const record = await Otp.findOne({ email: user.email });
    expect(record).not.toBeNull();
    expect(record.attempts).toBe(1);
  });

  test('incorrect OTP on 3rd attempt -> invalidated, deleted, follow-up -> "no active OTP" (AC-010, AC-013)', async () => {
    const user = await User.create({ name: 'Jane', email: 'verify3@example.com', password: 'hashedpw' });
    await Otp.create({ email: user.email, otp: '1234', attempts: 2 });

    const res = await request(app).post('/api/auth/otp/verify').send({ email: user.email, otp: '9999' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalidated/i);
    const record = await Otp.findOne({ email: user.email });
    expect(record).toBeNull();

    const followUp = await request(app).post('/api/auth/otp/verify').send({ email: user.email, otp: '1234' });
    expect(followUp.status).toBe(401);
    expect(followUp.body.message).toMatch(/no active otp/i);
  });

  test('OTP submitted after 60s -> HTTP 401 expired (AC-011)', async () => {
    const user = await User.create({ name: 'Jane', email: 'verify4@example.com', password: 'hashedpw' });
    await Otp.create({ email: user.email, otp: '1234', attempts: 0, generatedAt: new Date(Date.now() - 61_000) });

    const res = await request(app).post('/api/auth/otp/verify').send({ email: user.email, otp: '1234' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/no active otp/i);
  });

  test('non-4-digit OTP -> HTTP 400, no DB lookup performed (AC-012)', async () => {
    const findSpy = jest.spyOn(Otp, 'findOneAndUpdate');

    const res = await request(app).post('/api/auth/otp/verify').send({ email: 'verify5@example.com', otp: '12a4' });

    expect(res.status).toBe(400);
    expect(findSpy).not.toHaveBeenCalled();
    findSpy.mockRestore();
  });

  test('response body never contains otp, attempts, or generatedAt (AC-015)', async () => {
    const user = await User.create({ name: 'Jane', email: 'verify6@example.com', password: 'hashedpw' });
    await Otp.create({ email: user.email, otp: '1234', attempts: 0 });

    const res = await request(app).post('/api/auth/otp/verify').send({ email: user.email, otp: '1234' });

    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toMatch(/"otp"/);
    expect(bodyStr).not.toMatch(/"attempts"/);
    expect(bodyStr).not.toMatch(/"generatedAt"/);
  });

  test('a second sendOtp call replaces the active record atomically (AC-025)', async () => {
    const user = await User.create({ name: 'Jane', email: 'verify7@example.com', password: 'hashedpw' });

    await request(app).post('/api/auth/otp/send').send({ email: user.email });
    const firstRecord = await Otp.findOne({ email: user.email });

    await request(app).post('/api/auth/otp/send').send({ email: user.email });
    const secondRecord = await Otp.findOne({ email: user.email });

    const allRecords = await Otp.find({ email: user.email });
    expect(allRecords).toHaveLength(1);
    expect(secondRecord.otp).not.toBe(firstRecord.otp);

    const oldOtpRes = await request(app)
      .post('/api/auth/otp/verify')
      .send({ email: user.email, otp: firstRecord.otp });
    // Old OTP is no longer valid unless it happens to collide with the new one.
    if (firstRecord.otp !== secondRecord.otp) {
      expect(oldOtpRes.status).toBe(401);
    }
  });

  test('malformed/non-string email -> HTTP 400 (AC-026 verify half, incl. NoSQL-operator payload)', async () => {
    const res1 = await request(app).post('/api/auth/otp/verify').send({ email: 'not-an-email', otp: '1234' });
    expect(res1.status).toBe(400);

    const res2 = await request(app).post('/api/auth/otp/verify').send({ email: { $ne: '' }, otp: '1234' });
    expect(res2.status).toBe(400);
  });
});
