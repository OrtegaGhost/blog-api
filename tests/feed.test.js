'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/db', () => ({
  comment: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
}));

jest.mock('../src/sockets', () => ({
  init: jest.fn(),
  getIO: jest.fn(() => ({ emit: jest.fn() })),
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

const mockComments = [
  {
    id: 'comment-uuid-1',
    content: 'Test comment',
    createdAt: new Date(),
    user: { id: 'user-uuid-123', username: 'testuser', name: 'Test User', profilePhoto: null },
  },
];

afterEach(() => jest.clearAllMocks());

// ─── GET /feed ────────────────────────────────────────────────────────────────
describe('GET /feed', () => {
  it('200 — returns comments list with valid token', async () => {
    prisma.comment.findMany.mockResolvedValue(mockComments);

    const res = await request(app)
      .get('/feed')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('comments');
    expect(res.body).toHaveProperty('total');
    expect(Array.isArray(res.body.comments)).toBe(true);
  });

  it('403 — returns error when Authorization header is absent', async () => {
    const res = await request(app).get('/feed');

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error', 'FORBIDDEN');
  });

  it('401 — returns error with invalid token', async () => {
    const res = await request(app)
      .get('/feed')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'INVALID_TOKEN');
  });
});

// ─── POST /feed ───────────────────────────────────────────────────────────────
describe('POST /feed', () => {
  it('200 — creates a comment with valid token and content', async () => {
    prisma.comment.create.mockResolvedValue(mockComments[0]);

    const res = await request(app)
      .post('/feed')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ content: 'This is a test comment' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('comment');
  });

  it('400 — returns error when content is empty', async () => {
    const res = await request(app)
      .post('/feed')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ content: '' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'VALIDATION_ERROR');
  });

  it('403 — returns error when Authorization header is absent', async () => {
    const res = await request(app)
      .post('/feed')
      .send({ content: 'Some comment' });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error', 'FORBIDDEN');
  });

  it('401 — returns error with invalid token', async () => {
    const res = await request(app)
      .post('/feed')
      .set('Authorization', 'Bearer invalid.token.here')
      .send({ content: 'Some comment' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'INVALID_TOKEN');
  });
});
