'use strict';

const multer = require('multer');

/**
 * Global Express error-handling middleware.
 * Must be registered AFTER all routes with exactly 4 parameters.
 * Normalizes errors from Multer, Zod and JWT into consistent JSON responses.
 *
 * @type {import('express').ErrorRequestHandler}
 */
const errorMiddleware = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  // ── Multer upload errors ────────────────────────────────────────────────────
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'FILE_TOO_LARGE',
        message: 'File size exceeds the 5 MB limit',
      });
    }
    return res.status(400).json({
      error: 'UPLOAD_ERROR',
      message: err.message,
    });
  }

  // ── Invalid file type from custom fileFilter ────────────────────────────────
  if (err.message?.startsWith('INVALID_FILE_TYPE')) {
    return res.status(400).json({
      error: 'INVALID_FILE_TYPE',
      message: 'Only JPEG, PNG, GIF and WebP images are allowed',
    });
  }

  // ── JWT errors (should be handled in middleware, but just in case) ──────────
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Invalid or expired token',
    });
  }

  // ── Default: internal server error ─────────────────────────────────────────
  const status = err.status || err.statusCode || 500;

  // Never expose internal error details in production
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';

  return res.status(status).json({
    error: err.code || 'INTERNAL_ERROR',
    message,
  });
};

module.exports = { errorMiddleware };
