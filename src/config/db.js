'use strict';

const { PrismaClient } = require('../generated/prisma');

/**
 * Prisma client singleton.
 * Re-uses a single instance across hot reloads in development
 * to avoid exhausting the database connection pool.
 */
const globalRef = globalThis;

const prisma =
  globalRef.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalRef.prisma = prisma;
}

module.exports = prisma;
