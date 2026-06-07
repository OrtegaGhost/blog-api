'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/db', () => ({
  comment: {
    findMany:   jest.fn(),
    findUnique: jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
    delete:     jest.fn(),
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

// ─── PUT /feed/:id ────────────────────────────────────────────────────────────
describe('PUT /feed/:id', () => {
  const ownComment = {
    id: 'comment-uuid-1',
    content: 'Original content',
    userId: 'user-uuid-123',
    parentId: null,
  };
  const updatedComment = {
    id: 'comment-uuid-1',
    content: 'Updated content',
    parentId: null,
    updatedAt: new Date(),
    user: { id: 'user-uuid-123', username: 'testuser', name: 'Test User', profilePhoto: null },
  };

  it('200 — updates comment when the author edits their own', async () => {
    prisma.comment.findUnique.mockResolvedValue(ownComment);
    prisma.comment.update.mockResolvedValue(updatedComment);

    const res = await request(app)
      .put('/feed/comment-uuid-1')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ content: 'Updated content' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('comment');
  });

  it('403 — returns error when a non-owner tries to edit', async () => {
    prisma.comment.findUnique.mockResolvedValue({ ...ownComment, userId: 'other-user-uuid' });

    const res = await request(app)
      .put('/feed/comment-uuid-1')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ content: 'Hijacked content' });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error', 'FORBIDDEN');
  });

  it('404 — returns error when comment does not exist', async () => {
    prisma.comment.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .put('/feed/nonexistent-id')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ content: 'Some content' });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'NOT_FOUND');
  });

  it('400 — returns error when content is empty', async () => {
    const res = await request(app)
      .put('/feed/comment-uuid-1')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ content: '' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'VALIDATION_ERROR');
  });

  it('403 — returns error when Authorization header is absent', async () => {
    const res = await request(app)
      .put('/feed/comment-uuid-1')
      .send({ content: 'Some content' });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error', 'FORBIDDEN');
  });

  it('401 — returns error with invalid token', async () => {
    const res = await request(app)
      .put('/feed/comment-uuid-1')
      .set('Authorization', 'Bearer invalid.token.here')
      .send({ content: 'Some content' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'INVALID_TOKEN');
  });
});

// ─── DELETE /feed/:id ─────────────────────────────────────────────────────────
describe('DELETE /feed/:id', () => {
  const ownComment = {
    id: 'comment-uuid-1',
    content: 'To be deleted',
    userId: 'user-uuid-123',
    parentId: null,
  };

  it('200 — deletes comment when the author requests deletion', async () => {
    prisma.comment.findUnique.mockResolvedValue(ownComment);
    prisma.comment.delete.mockResolvedValue(ownComment);

    const res = await request(app)
      .delete('/feed/comment-uuid-1')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('403 — returns error when a non-owner tries to delete', async () => {
    prisma.comment.findUnique.mockResolvedValue({ ...ownComment, userId: 'other-user-uuid' });

    const res = await request(app)
      .delete('/feed/comment-uuid-1')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error', 'FORBIDDEN');
  });

  it('404 — returns error when comment does not exist', async () => {
    prisma.comment.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete('/feed/nonexistent-id')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'NOT_FOUND');
  });

  it('403 — returns error when Authorization header is absent', async () => {
    const res = await request(app).delete('/feed/comment-uuid-1');

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error', 'FORBIDDEN');
  });

  it('401 — returns error with invalid token', async () => {
    const res = await request(app)
      .delete('/feed/comment-uuid-1')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'INVALID_TOKEN');
  });
});
