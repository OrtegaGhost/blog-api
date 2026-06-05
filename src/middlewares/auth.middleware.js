'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Factory that returns a JWT authentication middleware.
 * The behaviour on a missing Authorization header differs per endpoint
 * as specified in the API contract:
 *   - /me          → 400 (missing required header treated as bad request)
 *   - /feed, /change-password → 403 (access forbidden)
 *
 * @param {{ missingTokenStatus?: number }} options
 * @returns {import('express').RequestHandler}
 */
const authenticate = (options = {}) => {
  const { missingTokenStatus = 403 } = options;

  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    // No Authorization header present
    if (!authHeader) {
      const isRejectedRequest = missingTokenStatus === 400;
      return res.status(missingTokenStatus).json({
        error: isRejectedRequest ? 'MISSING_HEADERS' : 'FORBIDDEN',
        message: isRejectedRequest
          ? 'Authorization header is required'
          : 'Access forbidden: authentication required',
      });
    }

    // Header present but not in Bearer format
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'INVALID_TOKEN_FORMAT',
        message: 'Authorization header must use Bearer scheme',
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = jwt.verify(token, env.JWT_SECRET);
      req.user = payload;
      next();
    } catch {
      // Catches both JsonWebTokenError and TokenExpiredError
      return res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      });
    }
  };
};

module.exports = { authenticate };
