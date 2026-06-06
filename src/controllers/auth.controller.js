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
    const { username } = req.validatedBody;
    try {
      const result = await authService.login(req.validatedBody);
      console.log(`[AUTH] LOGIN_SUCCESS username=${username} ip=${req.ip}`);
      return sendSuccess(res, 200, result);
    } catch (err) {
      console.warn(`[AUTH] LOGIN_FAILED username=${username} ip=${req.ip} reason=${err.code}`);
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
  async updateProfilePhoto(req, res) {
    if (!req.file) return sendError(res, 400, 'MISSING_FILE', 'Photo file is required');
    try {
      const user = await authService.updateProfilePhoto(req.user.sub, req.file.filename);
      return sendSuccess(res, 200, user);
    } catch (err) {
      return sendError(res, err.status || 500, err.code || 'UPDATE_PHOTO_ERROR', err.message);
    }
  }

  async updateCoverPhoto(req, res) {
    if (!req.file) return sendError(res, 400, 'MISSING_FILE', 'Cover photo file is required');
    try {
      const user = await authService.updateCoverPhoto(req.user.sub, req.file.filename);
      return sendSuccess(res, 200, user);
    } catch (err) {
      return sendError(res, err.status || 500, err.code || 'UPDATE_COVER_ERROR', err.message);
    }
  }

  async changePassword(req, res) {
    try {
      const result = await authService.changePassword(req.user.sub, req.validatedBody);
      console.log(`[AUTH] PASSWORD_CHANGED userId=${req.user.sub} ip=${req.ip}`);
      return sendSuccess(res, 200, result);
    } catch (err) {
      console.warn(`[AUTH] PASSWORD_CHANGE_FAILED userId=${req.user.sub} ip=${req.ip} reason=${err.code}`);
      return sendError(res, err.status || 500, err.code || 'CHANGE_PASSWORD_ERROR', err.message);
    }
  }

  /**
   * PUT /me/name
   * Actualiza el nombre del usuario autenticado.
   */
  async updateName(req, res) {
    try {
      const user = await authService.updateName(req.user.sub, req.validatedBody.name);
      return sendSuccess(res, 200, user);
    } catch (err) {
      return sendError(res, err.status || 500, err.code || 'UPDATE_NAME_ERROR', err.message);
    }
  }

  /**
   * DELETE /me
   * Elimina la cuenta del usuario autenticado y todas sus publicaciones.
   */
  async deleteAccount(req, res) {
    try {
      await authService.deleteAccount(req.user.sub);
      console.log(`[AUTH] ACCOUNT_DELETED userId=${req.user.sub} ip=${req.ip}`);
      return sendSuccess(res, 200, { message: 'Account deleted successfully' });
    } catch (err) {
      return sendError(res, err.status || 500, err.code || 'DELETE_ACCOUNT_ERROR', err.message);
    }
  }

  /**
   * GET /forgot-password/:username
   * Public — returns the security question key for the given username.
   */
  async getSecurityQuestion(req, res) {
    try {
      const result = await authService.getSecurityQuestion(req.params.username);
      return sendSuccess(res, 200, result);
    } catch (err) {
      return sendError(res, err.status || 500, err.code || 'FORGOT_ERROR', err.message);
    }
  }

  /**
   * POST /forgot-password
   * Public — verifies security answer and resets the password.
   */
  async resetPassword(req, res) {
    const { username } = req.validatedBody;
    try {
      const result = await authService.resetPassword(req.validatedBody);
      console.log(`[AUTH] PASSWORD_RESET username=${username} ip=${req.ip}`);
      return sendSuccess(res, 200, result);
    } catch (err) {
      console.warn(`[AUTH] PASSWORD_RESET_FAILED username=${username} ip=${req.ip} reason=${err.code}`);
      return sendError(res, err.status || 500, err.code || 'RESET_ERROR', err.message);
    }
  }
}

module.exports = new AuthController();
