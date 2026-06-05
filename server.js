'use strict';

const http = require('http');
const app = require('./src/app');
const { init: initSockets } = require('./src/sockets');
const prisma = require('./src/config/db');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

// Attach Socket.io to the HTTP server
initSockets(server);

/**
 * Graceful shutdown — closes the HTTP server and disconnects Prisma
 * before the process exits to release resources cleanly.
 */
const shutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('[Server] HTTP server closed. Database connection released.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
});
