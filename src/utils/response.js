'use strict';

/**
 * Sends a standardized success response.
 * @param {import('express').Response} res
 * @param {number} status - HTTP status code
 * @param {object} data - Response payload
 */
const sendSuccess = (res, status, data) => res.status(status).json(data);

/**
 * Sends a standardized error response.
 * @param {import('express').Response} res
 * @param {number} status - HTTP status code
 * @param {string} error - Machine-readable error code
 * @param {string} message - Human-readable error message
 */
const sendError = (res, status, error, message) =>
  res.status(status).json({ error, message });

module.exports = { sendSuccess, sendError };
