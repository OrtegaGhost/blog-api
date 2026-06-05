'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock the database module before importing the app
jest.mock('../src/config/db', () => ({
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

// Mock Socket.io — not needed for auth tests
jest.mock('../src/sockets', () => ({
  init: jest.fn(),
  getIO: jest.fn(),
}));

const app = require('../src/app');
const prisma = require('../src/config/db');

/** Generates a valid JWT for testing protected routes */
const makeToken = (payload = {}) =>
  jwt.sign(
    { sub: 'user-uuid-123', username: 'testuser', ...payload },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

afterEach(() => jest.clearAllMocks());

// ─── POST /login ─────────────────────────────────────────────────────────────
describe('POST /login', () => {
  it('200 — returns token on valid credentials', async () => {
    const hashedPassword = await bcrypt.hash('Password1', 12);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-uuid-123',
      username: 'testuser',
      password: hashedPassword,
    });

    const res = await request(app)
      .post('/login')
      .send({ username: 'testuser', password: 'Password1' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token_type', 'Bearer');
    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('expiration');
  });

  it('401 — returns error on wrong password', async () => {
    const hashedPassword = await bcrypt.hash('Password1', 12);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-uuid-123',
      username: 'testuser',
      password: hashedPassword,
    });

    const res = await request(app)
      .post('/login')
      .send({ username: 'testuser', password: 'WrongPassword1' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('401 — returns error when user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/login')
      .send({ username: 'nonexistent', password: 'Password1' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('400 — returns error when username is missing', async () => {
    const res = await request(app)
      .post('/login')
      .send({ password: 'Password1' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'VALIDATION_ERROR');
  });

  it('400 — returns error when password is missing', async () => {
    const res = await request(app)
      .post('/login')
      .send({ username: 'testuser' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'VALIDATION_ERROR');
  });

  it('400 — returns error when both fields are missing', async () => {
    const res = await request(app).post('/login').send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'VALIDATION_ERROR');
  });
});

// ─── POST /register ───────────────────────────────────────────────────────────
describe('POST /register', () => {
  it('201 — registers user with valid data and file', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'new-uuid' });

    const res = await request(app)
      .post('/register')
      .field('name', 'John Doe')
      .field('email', 'john@example.com')
      .field('username', 'johndoe')
      .field('password', 'Password1')
      .attach('profilePhoto', Buffer.from('fake-image'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('redirect');
  });

  it('400 — returns error when name contains numbers', async () => {
    const res = await request(app)
      .post('/register')
      .field('name', 'John123')
      .field('email', 'john@example.com')
      .field('username', 'johndoe')
      .field('password', 'Password1')
      .attach('profilePhoto', Buffer.from('fake-image'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'VALIDATION_ERROR');
  });

  it('400 — returns error when email format is invalid', async () => {
    const res = await request(app)
      .post('/register')
      .field('name', 'John Doe')
      .field('email', 'not-an-email')
      .field('username', 'johndoe')
      .field('password', 'Password1')
      .attach('profilePhoto', Buffer.from('fake-image'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'VALIDATION_ERROR');
  });

  it('400 — returns error when required fields are missing', async () => {
    const res = await request(app)
      .post('/register')
      .field('name', 'John Doe');

    expect(res.status).toBe(400);
  });
});

// ─── GET /me ─────────────────────────────────────────────────────────────────
describe('GET /me', () => {
  it('200 — returns user profile with valid token', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-uuid-123',
      name: 'John Doe',
      email: 'john@example.com',
      username: 'testuser',
      profilePhoto: '/uploads/photo.jpg',
      createdAt: new Date(),
    });

    const res = await request(app)
      .get('/me')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('username', 'testuser');
    expect(res.body).not.toHaveProperty('password');
  });

  it('400 — returns error when Authorization header is absent', async () => {
    const res = await request(app).get('/me');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'MISSING_HEADERS');
  });

  it('401 — returns error with invalid token', async () => {
    const res = await request(app)
      .get('/me')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'INVALID_TOKEN');
  });
});

// ─── PUT /change-password ─────────────────────────────────────────────────────
describe('PUT /change-password', () => {
  it('200 — updates password with valid data', async () => {
    const hashedPassword = await bcrypt.hash('OldPassword1', 12);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-uuid-123',
      password: hashedPassword,
    });
    prisma.user.update.mockResolvedValue({});

    const res = await request(app)
      .put('/change-password')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ current_password: 'OldPassword1', new_password: 'NewPassword1' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('403 — returns error when Authorization header is absent', async () => {
    const res = await request(app)
      .put('/change-password')
      .send({ current_password: 'OldPassword1', new_password: 'NewPassword1' });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error', 'FORBIDDEN');
  });

  it('401 — returns error with invalid token', async () => {
    const res = await request(app)
      .put('/change-password')
      .set('Authorization', 'Bearer invalid.token.here')
      .send({ current_password: 'OldPassword1', new_password: 'NewPassword1' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'INVALID_TOKEN');
  });
});
