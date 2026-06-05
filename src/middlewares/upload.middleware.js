'use strict';

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');

/** Allowed MIME types for profile photos */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

/**
 * Disk storage configuration.
 * Files are saved with a cryptographically random name to prevent
 * path traversal and filename collision attacks.
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, env.UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const randomName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomName}${ext}`);
  },
});

/**
 * Rejects files that are not images.
 * Using a Set for O(1) lookup instead of iterating an array.
 */
const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('INVALID_FILE_TYPE: Only image files are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(env.MAX_FILE_SIZE, 10),
  },
});

module.exports = { upload };
