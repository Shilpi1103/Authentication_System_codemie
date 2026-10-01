process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mern-jwt-auth-test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

jest.mock('../config/mailer', () => ({
  transporter: { sendMail: jest.fn().mockResolvedValue({ accepted: [true] }) },
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
});

describe('Existing password-auth endpoints — regression (AC-014)', () => {
  test('POST /api/auth/register — unchanged request/response shape and status code', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Jane', email: 'reg@example.com', password: 'secret123' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      message: 'Registration successful.',
      user: { name: 'Jane', email: 'reg@example.com' },
    });
    expect(res.body.token).toBeTruthy();
  });

  test('POST /api/auth/login — unchanged request/response shape and status code', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Jane', email: 'log@example.com', password: 'secret123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'log@example.com', password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      message: 'Login successful.',
      user: { name: 'Jane', email: 'log@example.com' },
    });
    expect(res.body.token).toBeTruthy();
  });

  test('GET /api/auth/profile — unchanged request/response shape and status code', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Jane', email: 'prof@example.com', password: 'secret123' });

    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${registerRes.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'Jane', email: 'prof@example.com' });
  });

  test('JWT issued by login and by verifyOtp decode to the same payload shape using the same JWT_SECRET', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Jane', email: 'jwt@example.com', password: 'secret123' });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jwt@example.com', password: 'secret123' });

    await Otp.create({ email: 'jwt@example.com', otp: '1234', attempts: 0 });
    const otpRes = await request(app)
      .post('/api/auth/otp/verify')
      .send({ email: 'jwt@example.com', otp: '1234' });

    const loginDecoded = jwt.verify(loginRes.body.token, process.env.JWT_SECRET);
    const otpDecoded = jwt.verify(otpRes.body.token, process.env.JWT_SECRET);

    expect(Object.keys(loginDecoded).sort()).toEqual(
      expect.arrayContaining(['id', 'iat', 'exp'])
    );
    expect(loginDecoded.id).toBe(otpDecoded.id);
    expect(loginDecoded.id).toBe(String(registerRes.body.user.id));
  });
});
