'use strict';

const prisma = require('../config/db');

const USER_SELECT = {
  id: true,
  username: true,
  name: true,
  profilePhoto: true,
};

class UsersService {
  /**
   * Devuelve el perfil publico de un usuario junto con sus comentarios raiz.
   * @param {string} username - Nombre de usuario a buscar
   * @returns {Promise<{ user: object, comments: object[], total: number }>}
   */
  async getUserProfile(username) {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        profilePhoto: true,
        coverPhoto: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw Object.assign(new Error('User not found'), { status: 404, code: 'NOT_FOUND' });
    }

    const comments = await prisma.comment.findMany({
      where:   { userId: user.id, parentId: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        createdAt: true,
        replies: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            content: true,
            createdAt: true,
            parentId: true,
            user: { select: USER_SELECT },
          },
        },
      },
    });

    // Adjunta el usuario a cada comentario para que el frontend pueda usar CommentCard
    const commentsWithUser = comments.map((c) => ({ ...c, user, parentId: null }));

    return { user, comments: commentsWithUser, total: commentsWithUser.length };
  }
}

module.exports = new UsersService();
