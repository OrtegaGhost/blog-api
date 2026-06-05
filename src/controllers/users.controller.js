'use strict';

const usersService = require('../services/users.service');
const { sendSuccess, sendError } = require('../utils/response');

class UsersController {
  /**
   * GET /users/:username
   * Devuelve el perfil publico de un usuario y sus comentarios.
   * Requiere autenticacion.
   */
  async getUserProfile(req, res) {
    try {
      const result = await usersService.getUserProfile(req.params.username);
      return sendSuccess(res, 200, result);
    } catch (err) {
      return sendError(res, err.status || 500, err.code || 'USER_ERROR', err.message);
    }
  }
}

module.exports = new UsersController();
