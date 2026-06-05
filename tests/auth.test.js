'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock the database module before importing the app
jest.mock('../src/config/db', () => ({
  user: {
    findFirst:  jest.fn(),
    findUnique: jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
    delete:     jest.fn(),
  },
}));

// Mock Socket.io — not needed for auth tests
jest.mock('../src/sockets', () => ({
  init: jest.fn(),
  getIO: jest.fn(),
}));

// Mock sharp para evitar que buffers de prueba fallen la conversion a WebP
jest.mock('sharp', () => () => ({
  resize: jest.fn().mockReturnThis(),
  webp:   jest.fn().mockReturnThis(),
  toFile: jest.fn().mockResolvedValue({}),
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
      .field('securityQuestion', 'q0')
      .field('securityAnswer', 'Firulais')
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
      .field('securityQuestion', 'q0')
      .field('securityAnswer', 'Firulais')
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
      .field('securityQuestion', 'q0')
      .field('securityAnswer', 'Firulais')
      .attach('profilePhoto', Buffer.from('fake-image'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'VALIDATION_ERROR');
  });

  it('400 — returns error when security question is invalid', async () => {
    const res = await request(app)
      .post('/register')
      .field('name', 'John Doe')
      .field('email', 'john@example.com')
      .field('username', 'johndoe')
      .field('password', 'Password1')
      .field('securityQuestion', 'invalid_key')
      .field('securityAnswer', 'Firulais')
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

// ─── PUT /me/photo ────────────────────────────────────────────────────────────
describe('PUT /me/photo', () => {
  const mockUser = {
    id: 'user-uuid-123',
    name: 'John Doe',
    email: 'john@example.com',
    username: 'testuser',
    profilePhoto: '/uploads/new-photo.webp',
    coverPhoto: null,
    createdAt: new Date(),
  };

  it('200 — updates profile photo with valid file', async () => {
    prisma.user.update.mockResolvedValue(mockUser);

    const res = await request(app)
      .put('/me/photo')
      .set('Authorization', `Bearer ${makeToken()}`)
      .attach('photo', Buffer.from('fake-image'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('profilePhoto');
  });

  it('400 — returns error when no file is attached', async () => {
    const res = await request(app)
      .put('/me/photo')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'MISSING_FILE');
  });

  it('403 — returns error when Authorization header is absent', async () => {
    const res = await request(app).put('/me/photo');

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error', 'FORBIDDEN');
  });

  it('401 — returns error with invalid token', async () => {
    const res = await request(app)
      .put('/me/photo')
      .set('Authorization', 'Bearer invalid.token.here')
      .attach('photo', Buffer.from('fake-image'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'INVALID_TOKEN');
  });
});

// ─── PUT /me/cover ────────────────────────────────────────────────────────────
describe('PUT /me/cover', () => {
  const mockUser = {
    id: 'user-uuid-123',
    name: 'John Doe',
    email: 'john@example.com',
    username: 'testuser',
    profilePhoto: null,
    coverPhoto: '/uploads/new-cover.webp',
    createdAt: new Date(),
  };

  it('200 — updates cover photo with valid file', async () => {
    prisma.user.update.mockResolvedValue(mockUser);

    const res = await request(app)
      .put('/me/cover')
      .set('Authorization', `Bearer ${makeToken()}`)
      .attach('cover', Buffer.from('fake-image'), {
        filename: 'cover.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('coverPhoto');
  });

  it('400 — returns error when no file is attached', async () => {
    const res = await request(app)
      .put('/me/cover')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'MISSING_FILE');
  });

  it('403 — returns error when Authorization header is absent', async () => {
    const res = await request(app).put('/me/cover');

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error', 'FORBIDDEN');
  });

  it('401 — returns error with invalid token', async () => {
    const res = await request(app)
      .put('/me/cover')
      .set('Authorization', 'Bearer invalid.token.here')
      .attach('cover', Buffer.from('fake-image'), {
        filename: 'cover.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'INVALID_TOKEN');
  });
});

// ─── PUT /me/name ─────────────────────────────────────────────────────────────
describe('PUT /me/name', () => {
  const mockUser = {
    id: 'user-uuid-123',
    name: 'Jane Doe',
    email: 'john@example.com',
    username: 'testuser',
    profilePhoto: null,
    coverPhoto: null,
    createdAt: new Date(),
  };

  it('200 — updates name with valid data', async () => {
    prisma.user.update.mockResolvedValue(mockUser);

    const res = await request(app)
      .put('/me/name')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'Jane Doe' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'Jane Doe');
  });

  it('400 — returns error when name contains numbers', async () => {
    const res = await request(app)
      .put('/me/name')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'Jane123' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'VALIDATION_ERROR');
  });

  it('400 — returns error when name is too short', async () => {
    const res = await request(app)
      .put('/me/name')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'J' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'VALIDATION_ERROR');
  });

  it('400 — returns error when name is missing', async () => {
    const res = await request(app)
      .put('/me/name')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'VALIDATION_ERROR');
  });

  it('403 — returns error when Authorization header is absent', async () => {
    const res = await request(app)
      .put('/me/name')
      .send({ name: 'Jane Doe' });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error', 'FORBIDDEN');
  });

  it('401 — returns error with invalid token', async () => {
    const res = await request(app)
      .put('/me/name')
      .set('Authorization', 'Bearer invalid.token.here')
      .send({ name: 'Jane Doe' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'INVALID_TOKEN');
  });
});

// ─── DELETE /me ───────────────────────────────────────────────────────────────
describe('DELETE /me', () => {
  it('200 — deletes account with valid token', async () => {
    prisma.user.delete.mockResolvedValue({});

    const res = await request(app)
      .delete('/me')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(prisma.user.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-uuid-123' } })
    );
  });

  it('403 — returns error when Authorization header is absent', async () => {
    const res = await request(app).delete('/me');

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error', 'FORBIDDEN');
  });

  it('401 — returns error with invalid token', async () => {
    const res = await request(app)
      .delete('/me')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'INVALID_TOKEN');
  });
});

// ─── GET /forgot-password/:username ──────────────────────────────────────────
describe('GET /forgot-password/:username', () => {
  it('200 — returns question key for existing username', async () => {
    prisma.user.findUnique.mockResolvedValue({
      securityQuestion: 'q0',
    });

    const res = await request(app).get('/forgot-password/testuser');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('questionKey', 'q0');
  });

  it('404 — returns error when username does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/forgot-password/nobody');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'USER_NOT_FOUND');
  });
});

// ─── POST /forgot-password ────────────────────────────────────────────────────
describe('POST /forgot-password', () => {
  it('200 — resets password with correct answer', async () => {
    const hashedAnswer = await require('bcryptjs').hash('firulais', 12);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-uuid-123',
      securityAnswer: hashedAnswer,
    });
    prisma.user.update.mockResolvedValue({});

    const res = await request(app)
      .post('/forgot-password')
      .send({ username: 'testuser', securityAnswer: 'Firulais', newPassword: 'NewPass1' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('400 — returns error when security answer is wrong', async () => {
    const hashedAnswer = await require('bcryptjs').hash('firulais', 12);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-uuid-123',
      securityAnswer: hashedAnswer,
    });

    const res = await request(app)
      .post('/forgot-password')
      .send({ username: 'testuser', securityAnswer: 'WrongAnswer', newPassword: 'NewPass1' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'WRONG_SECURITY_ANSWER');
  });

  it('404 — returns error when username does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/forgot-password')
      .send({ username: 'nobody', securityAnswer: 'answer', newPassword: 'NewPass1' });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'USER_NOT_FOUND');
  });

  it('400 — returns error when newPassword fails validation', async () => {
    const res = await request(app)
      .post('/forgot-password')
      .send({ username: 'testuser', securityAnswer: 'answer', newPassword: 'weak' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'VALIDATION_ERROR');
  });
});
