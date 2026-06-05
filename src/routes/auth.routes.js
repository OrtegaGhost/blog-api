'use strict';

const { Router } = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { upload, processImage } = require('../middlewares/upload.middleware');
const authController = require('../controllers/auth.controller');
const {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} = require('../utils/validators');

const router = Router();

/**
 * POST /register
 * Public endpoint — creates a new user account.
 * Accepts multipart/form-data (name, email, username, password + profilePhoto file).
 */
router.post(
  '/register',
  upload.single('profilePhoto'),
  processImage,
  validate(registerSchema),
  authController.register.bind(authController)
);

/**
 * POST /login
 * Public endpoint — authenticates a user and returns a JWT.
 */
router.post(
  '/login',
  validate(loginSchema),
  authController.login.bind(authController)
);

/**
 * GET /me
 * Protected — returns the authenticated user's profile.
 * Returns 400 when Authorization header is absent (per spec).
 */
router.get(
  '/me',
  authenticate({ missingTokenStatus: 400 }),
  authController.me.bind(authController)
);

/**
 * PUT /change-password
 * Protected — updates the authenticated user's password.
 * Returns 403 when Authorization header is absent (per spec).
 */
router.put(
  '/change-password',
  authenticate(),
  validate(changePasswordSchema),
  authController.changePassword.bind(authController)
);

module.exports = router;
