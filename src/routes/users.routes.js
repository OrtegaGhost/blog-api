'use strict';

const { Router } = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const usersController = require('../controllers/users.controller');

const router = Router();

/**
 * GET /users/:username
 * Protected — devuelve perfil publico de un usuario con sus comentarios.
 */
router.get(
  '/:username',
  authenticate(),
  usersController.getUserProfile.bind(usersController)
);

module.exports = router;
