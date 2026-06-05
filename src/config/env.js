'use strict';

require('dotenv').config();

const { z } = require('zod');

/**
 * Validates and parses required environment variables at startup.
 * Throws immediately if any required variable is missing or invalid,
 * preventing the app from starting in a broken state.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters for security'),
  JWT_EXPIRATION: z.string().default('24h'),
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_FILE_SIZE: z.string().default('5242880'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const missing = result.error.issues.map((i) => i.path.join('.')).join(', ');
  throw new Error(`Invalid environment configuration: ${missing}`);
}

module.exports = result.data;
