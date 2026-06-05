'use strict';

// Set test environment variables before any module is loaded
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';
process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough-for-tests';
process.env.JWT_EXPIRATION = '24h';
process.env.UPLOAD_DIR = 'uploads';
process.env.MAX_FILE_SIZE = '5242880';
process.env.CORS_ORIGIN = 'http://localhost:5173';
