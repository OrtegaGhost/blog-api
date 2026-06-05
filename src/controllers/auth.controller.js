'use strict';

const authService = require('../services/auth.service');
const { sendSuccess, sendError } = require('../utils/response');

class AuthController {
  /**
   * POST /register
   * Expects multipart/form-data with fields: name, email, username, password
   * and a file field named "profilePhoto".
   */
  async register(req, res) {
    // Profile photo is required per the spec
    if (!req.file) {
      return sendError(res, 400, 'MISSING_PROFILE_PHOTO', 'Profile photo is required');
    }

    const profilePhotoUrl = `/uploads/${req.file.filename}`;

    try {
      const result = await authService.register({
        ...req.validatedBody,
        profilePhoto: profilePhotoUrl,
      });
      return sendSuccess(res, 201, result);
    } catch (err) {
      return sendError(res, err.status || 500, err.code || 'REGISTER_ERROR', err.message);
    }
  }

  /**
   * POST /login
   * Expects JSON body: { username, password }
   */
  async login(req, res) {
    try {
      const result = await authService.login(req.validatedBody);
      return sendSuccess(res, 200, result);
    } catch (err) {
      return sendError(res, err.status || 500, err.code || 'LOGIN_ERROR', err.message);
    }
  }

  /**
   * GET /me
   * Requires Authorization: Bearer <token>
   */
  async me(req, res) {
    try {
      const user = await authService.getProfile(req.user.sub);
      return sendSuccess(res, 200, user);
    } catch (err) {
      return sendError(res, err.status || 500, err.code || 'PROFILE_ERROR', err.message);
    }
  }

  /**
   * PUT /change-password
   * Requires Authorization: Bearer <token>
   * Expects JSON body: { current_password, new_password }
   */
  async changePassword(req, res) {
    try {
      const result = await authService.changePassword(
        req.user.sub,
        req.validatedBody
      );
      return sendSuccess(res, 200, result);
    } catch (err) {
      return sendError(res, err.status || 500, err.code || 'CHANGE_PASSWORD_ERROR', err.message);
    }
  }
}

module.exports = new AuthController();
