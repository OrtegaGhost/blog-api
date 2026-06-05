'use strict';

const { Server } = require('socket.io');
const env = require('../config/env');

/** Singleton Socket.io instance — initialized once in server.js */
let io = null;

/**
 * Initializes Socket.io on the given HTTP server.
 * Must be called before any service tries to emit events.
 *
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
const init = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN.split(','),
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    // Log connections only in non-production to avoid log spam
    if (env.NODE_ENV !== 'production') {
      console.log(`[Socket.io] Client connected: ${socket.id}`);
    }

    socket.on('disconnect', () => {
      if (env.NODE_ENV !== 'production') {
        console.log(`[Socket.io] Client disconnected: ${socket.id}`);
      }
    });
  });

  return io;
};

/**
 * Returns the initialized Socket.io instance.
 * Throws if called before init() — indicates a startup ordering bug.
 *
 * @returns {import('socket.io').Server}
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized. Call init() first.');
  }
  return io;
};

module.exports = { init, getIO };
