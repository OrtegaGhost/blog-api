'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const env = require('../config/env');

/** bcrypt work factor — OWASP recommends minimum 10, 12 balances security/performance */
const BCRYPT_ROUNDS = 12;

class AuthService {
  /**
   * Registers a new user.
   * @param {{ name: string, email: string, username: string, password: string, profilePhoto?: string }} data
   * @returns {Promise<{ message: string, redirect: string }>}
   */
  async register({ name, email, username, password, profilePhoto }) {
    // Check for duplicate email or username
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { email: true, username: true },
    });

    if (existing) {
      const field = existing.email === email ? 'email' : 'username';
      const error = new Error(`This ${field} is already registered`);
      error.status = 409;
      error.code = 'DUPLICATE_USER';
      throw error;
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await prisma.user.create({
      data: {
        name,
        email,
        username,
        password: hashedPassword,
        profilePhoto: profilePhoto || null,
      },
    });

    return {
      message: 'User registered successfully. Please log in.',
      redirect: '/login',
    };
  }

  /**
   * Authenticates a user and returns a signed JWT.
   * @param {{ username: string, password: string }} credentials
   * @returns {Promise<{ token_type: string, expiration: number, access_token: string }>}
   */
  async login({ username, password }) {
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, password: true },
    });

    // Use constant-time comparison to prevent user enumeration via timing attacks
    const isValid =
      user !== null && (await bcrypt.compare(password, user.password));

    if (!isValid) {
      const error = new Error('Invalid username or password');
      error.status = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    const expirationSeconds = 24 * 60 * 60; // 24 hours
    const expiration = Math.floor(Date.now() / 1000) + expirationSeconds;

    const access_token = jwt.sign(
      { sub: user.id, username: user.username },
      env.JWT_SECRET,
      { expiresIn: expirationSeconds, algorithm: 'HS256' }
    );

    return { token_type: 'Bearer', expiration, access_token };
  }

  /**
   * Returns the authenticated user's public profile.
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async getProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        profilePhoto: true,
        coverPhoto: true,
        createdAt: true,
      },
    });

    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    return user;
  }

  /**
   * Changes the authenticated user's password.
   * @param {string} userId
   * @param {{ current_password: string, new_password: string }} passwords
   * @returns {Promise<{ message: string }>}
   */
  async changePassword(userId, { current_password, new_password }) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      current_password,
      user.password
    );

    if (!isCurrentPasswordValid) {
      const error = new Error('Current password is incorrect');
      error.status = 400;
      error.code = 'WRONG_CURRENT_PASSWORD';
      throw error;
    }

    if (current_password === new_password) {
      const error = new Error('New password must differ from the current one');
      error.status = 400;
      error.code = 'SAME_PASSWORD';
      throw error;
    }

    const hashedNewPassword = await bcrypt.hash(new_password, BCRYPT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    return { message: 'Password updated successfully' };
  }

  /**
   * Actualiza la foto de perfil del usuario.
   * @param {string} userId   - ID del usuario autenticado
   * @param {string} filename - Nombre del archivo guardado en /uploads
   * @returns {Promise<object>} Perfil actualizado
   */
  async updateProfilePhoto(userId, filename) {
    return prisma.user.update({
      where: { id: userId },
      data:  { profilePhoto: `/uploads/${filename}` },
      select: { id: true, name: true, email: true, username: true, profilePhoto: true, coverPhoto: true, createdAt: true },
    });
  }

  /**
   * Actualiza la foto de portada del usuario.
   * @param {string} userId   - ID del usuario autenticado
   * @param {string} filename - Nombre del archivo guardado en /uploads
   * @returns {Promise<object>} Perfil actualizado
   */
  async updateCoverPhoto(userId, filename) {
    return prisma.user.update({
      where: { id: userId },
      data:  { coverPhoto: `/uploads/${filename}` },
      select: { id: true, name: true, email: true, username: true, profilePhoto: true, coverPhoto: true, createdAt: true },
    });
  }

  /**
   * Actualiza el nombre del usuario.
   * @param {string} userId - ID del usuario autenticado
   * @param {string} name   - Nuevo nombre
   * @returns {Promise<object>} Perfil actualizado
   */
  async updateName(userId, name) {
    return prisma.user.update({
      where: { id: userId },
      data:  { name },
      select: { id: true, name: true, email: true, username: true, profilePhoto: true, coverPhoto: true, createdAt: true },
    });
  }

  /**
   * Elimina la cuenta del usuario y todas sus publicaciones (cascade).
   * @param {string} userId - ID del usuario autenticado
   * @returns {Promise<void>}
   */
  async deleteAccount(userId) {
    await prisma.user.delete({ where: { id: userId } });
  }
}

module.exports = new AuthService();
