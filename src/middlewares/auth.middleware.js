'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Factory that returns a JWT authentication middleware.
 * Token resolution order: HttpOnly cookie → Authorization Bearer header.
 * This dual-source approach lets browser clients use the secure cookie
 * while the test suite continues to use Authorization headers unchanged.
 *
 * The behaviour on a missing token differs per endpoint:
 *   - /me          → 400 (missing required header treated as bad request)
 *   - /feed, /change-password → 403 (access forbidden)
 *
 * @param {{ missingTokenStatus?: number }} options
 * @returns {import('express').RequestHandler}
 */
const authenticate = (options = {}) => {
  const { missingTokenStatus = 403 } = options;

  return (req, res, next) => {
    // 1. Prefer HttpOnly cookie (ASVS V8.2.2 — token not in JS-accessible storage)
    const cookieToken = req.cookies?.access_token;
    if (cookieToken) {
      try {
        req.user = jwt.verify(cookieToken, env.JWT_SECRET);
        return next();
      } catch {
        return res.status(401).json({ error: 'INVALID_TOKEN', message: 'Invalid or expired token' });
      }
    }

    // 2. Fall back to Authorization: Bearer header (API clients / test suite)
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      const isRejectedRequest = missingTokenStatus === 400;
      return res.status(missingTokenStatus).json({
        error: isRejectedRequest ? 'MISSING_HEADERS' : 'FORBIDDEN',
        message: isRejectedRequest
          ? 'Authorization header is required'
          : 'Access forbidden: authentication required',
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'INVALID_TOKEN_FORMAT',
        message: 'Authorization header must use Bearer scheme',
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      req.user = jwt.verify(token, env.JWT_SECRET);
      next();
    } catch {
      return res.status(401).json({ error: 'INVALID_TOKEN', message: 'Invalid or expired token' });
    }
  };
};

module.exports = { authenticate };
