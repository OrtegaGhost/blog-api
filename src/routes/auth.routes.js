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
  nameSchema,
  forgotPasswordSchema,
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
 * PUT /me/photo
 * Protected — reemplaza la foto de perfil del usuario autenticado.
 */
router.put(
  '/me/photo',
  authenticate(),
  upload.single('photo'),
  processImage,
  authController.updateProfilePhoto.bind(authController)
);

/**
 * PUT /me/cover
 * Protected — reemplaza la foto de portada del usuario autenticado.
 */
router.put(
  '/me/cover',
  authenticate(),
  upload.single('cover'),
  processImage,
  authController.updateCoverPhoto.bind(authController)
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

/**
 * PUT /me/name
 * Protected — actualiza el nombre del usuario autenticado.
 */
router.put(
  '/me/name',
  authenticate(),
  validate(nameSchema),
  authController.updateName.bind(authController)
);

/**
 * DELETE /me
 * Protected — elimina la cuenta del usuario autenticado y sus publicaciones en cascade.
 */
router.delete(
  '/me',
  authenticate(),
  authController.deleteAccount.bind(authController)
);

/**
 * GET /forgot-password/:username
 * Public — returns the security question key for the given username.
 */
router.get(
  '/forgot-password/:username',
  authController.getSecurityQuestion.bind(authController)
);

/**
 * POST /forgot-password
 * Public — verifies security answer and resets the password.
 */
router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  authController.resetPassword.bind(authController)
);

module.exports = router;
