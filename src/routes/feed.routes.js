'use strict';

const { Router } = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const feedController = require('../controllers/feed.controller');
const { commentSchema } = require('../utils/validators');

const router = Router();

/**
 * GET /feed
 * Protected — returns the list of all comments.
 * Returns 403 when Authorization header is absent (per spec).
 */
router.get(
  '/',
  authenticate(),
  feedController.getComments.bind(feedController)
);

/**
 * POST /feed
 * Protected — creates a new comment and broadcasts it via Socket.io.
 * Returns 403 when Authorization header is absent (per spec).
 */
router.post(
  '/',
  authenticate(),
  validate(commentSchema),
  feedController.createComment.bind(feedController)
);

module.exports = router;
