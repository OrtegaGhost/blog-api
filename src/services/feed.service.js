'use strict';

const prisma = require('../config/db');
const { getIO } = require('../sockets');

/** Fields selected for the comment author to avoid exposing sensitive data */
const USER_SELECT = {
  id: true,
  username: true,
  name: true,
  profilePhoto: true,
};

class FeedService {
  /**
   * Returns all comments ordered by most recent first.
   * @returns {Promise<{ comments: object[], total: number }>}
   */
  async getComments() {
    const comments = await prisma.comment.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: { select: USER_SELECT },
      },
    });

    return { comments, total: comments.length };
  }

  /**
   * Creates a new comment and broadcasts it to all connected Socket.io clients.
   * @param {string} userId - ID of the authenticated author
   * @param {string} content - Comment text
   * @returns {Promise<{ message: string, comment: object }>}
   */
  async createComment(userId, content) {
    const comment = await prisma.comment.create({
      data: { content, userId },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: { select: USER_SELECT },
      },
    });

    // Broadcast the new comment to all connected clients in real time
    try {
      getIO().emit('comment:new', comment);
    } catch {
      // Socket.io not initialized (e.g., during tests) — safe to ignore
    }

    return { message: 'Comment created successfully', comment };
  }
}

module.exports = new FeedService();
