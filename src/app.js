'use strict';

require('./config/env'); // Validate env vars at startup — fails fast if misconfigured
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const routes = require('./routes');
const { errorMiddleware } = require('./middlewares/error.middleware');

const app = express();

// ── Security headers (OWASP A05) ──────────────────────────────────────────────
app.use(helmet());

// Permissions-Policy: restrict all browser features (not included in Helmet 8)
app.use((_req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'
  );
  next();
});

// Prevent caching of API responses that may contain sensitive data
app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Global rate limiter (OWASP A07) ──────────────────────────────────────────
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded, try again later' },
  })
);

// Stricter rate limit for authentication endpoints to prevent brute-force
app.use(
  '/login',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'TOO_MANY_REQUESTS', message: 'Too many login attempts, try again later' },
  })
);

app.use(
  '/register',
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: { error: 'TOO_MANY_REQUESTS', message: 'Too many registration attempts, try again later' },
  })
);

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' })); // Limit body size to prevent DoS
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Static files — serve uploaded profile photos ──────────────────────────────
// Override Helmet's Cross-Origin-Resource-Policy so browsers on a different
// origin (e.g. localhost:5173) can load profile photo <img> tags.
app.use(
  '/uploads',
  (req, res, next) => { res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); next(); },
  express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads'))
);

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/', routes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Route not found' });
});

// ── Global error handler (must be last) ──────────────────────────────────────
app.use(errorMiddleware);

module.exports = app;
