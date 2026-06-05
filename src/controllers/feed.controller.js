'use strict';

const feedService = require('../services/feed.service');
const { sendSuccess, sendError } = require('../utils/response');

class FeedController {
  /**
   * GET /feed
   * Returns all comments. Requires Authorization: Bearer <token>
   */
  async getComments(req, res) {
    try {
      const result = await feedService.getComments();
      return sendSuccess(res, 200, result);
    } catch (err) {
      return sendError(res, err.status || 500, err.code || 'FEED_ERROR', err.message);
    }
  }

  /**
   * POST /feed
   * Creates a new comment and broadcasts it via Socket.io.
   * Requires Authorization: Bearer <token>
   * Expects JSON body: { content }
   */
  async updateComment(req, res) {
    try {
      const result = await feedService.updateComment(
        req.user.sub,
        req.params.id,
        req.validatedBody.content
      );
      return sendSuccess(res, 200, result);
    } catch (err) {
      return sendError(res, err.status || 500, err.code || 'UPDATE_COMMENT_ERROR', err.message);
    }
  }

  async deleteComment(req, res) {
    try {
      const result = await feedService.deleteComment(req.user.sub, req.params.id);
      return sendSuccess(res, 200, result);
    } catch (err) {
      return sendError(res, err.status || 500, err.code || 'DELETE_COMMENT_ERROR', err.message);
    }
  }

  async createComment(req, res) {
    try {
      const result = await feedService.createComment(
        req.user.sub,
        req.validatedBody.content,
        req.validatedBody.parentId ?? null
      );
      return sendSuccess(res, 200, result);
    } catch (err) {
      return sendError(res, err.status || 500, err.code || 'CREATE_COMMENT_ERROR', err.message);
    }
  }
}

module.exports = new FeedController();
