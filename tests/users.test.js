'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/db', () => ({
  user: {
    findUnique: jest.fn(),
  },
  comment: {
    findMany: jest.fn(),
  },
}));

jest.mock('../src/sockets', () => ({
  init: jest.fn(),
  getIO: jest.fn(() => ({ emit: jest.fn() })),
}));

const app    = require('../src/app');
const prisma = require('../src/config/db');

const makeToken = (payload = {}) =>
  jwt.sign(
    { sub: 'user-uuid-123', username: 'testuser', ...payload },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

const mockUser = {
  id:           'user-uuid-123',
  name:         'Test User',
  username:     'testuser',
  profilePhoto: null,
  coverPhoto:   null,
  createdAt:    new Date(),
};

const mockComments = [
  {
    id:        'comment-uuid-1',
    content:   'Hello world',
    createdAt: new Date(),
    parentId:  null,
    replies:   [],
  },
];

afterEach(() => jest.clearAllMocks());

// ─── GET /users/:username ─────────────────────────────────────────────────────
describe('GET /users/:username', () => {
  it('200 — returns public profile and comments for existing user', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);
    prisma.comment.findMany.mockResolvedValue(mockComments);

    const res = await request(app)
      .get('/users/testuser')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body).toHaveProperty('comments');
    expect(res.body).toHaveProperty('total');
    expect(res.body.user).toHaveProperty('username', 'testuser');
    expect(Array.isArray(res.body.comments)).toBe(true);
  });

  it('404 — returns error when username does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/users/ghost')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'NOT_FOUND');
  });

  it('403 — returns error when Authorization header is absent', async () => {
    const res = await request(app).get('/users/testuser');

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error', 'FORBIDDEN');
  });

  it('401 — returns error with invalid token', async () => {
    const res = await request(app)
      .get('/users/testuser')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'INVALID_TOKEN');
  });
});
