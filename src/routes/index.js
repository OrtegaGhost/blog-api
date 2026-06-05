'use strict';

const { Router } = require('express');
const authRoutes  = require('./auth.routes');
const feedRoutes  = require('./feed.routes');
const usersRoutes = require('./users.routes');

const router = Router();

/** Health check — useful for Docker healthchecks and monitoring */
router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/', authRoutes);
router.use('/feed', feedRoutes);
router.use('/users', usersRoutes);

module.exports = router;
