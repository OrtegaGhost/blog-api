'use strict';

const prisma = require('../config/db');
const { getIO } = require('../sockets');

/** Fields selected for the comment author to avoid exposing sensitive data */
const USER_SELECT = {
  id: true,
  username: true,
  name: true,
  profilePhoto: true,
};

class FeedService {
  /**
   * Devuelve solo los comentarios raiz (sin padre) con sus respuestas anidadas.
   * @returns {Promise<{ comments: object[], total: number }>}
   */
  async getComments() {
    const comments = await prisma.comment.findMany({
      where:   { parentId: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: { select: USER_SELECT },
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

    return { comments, total: comments.length };
  }

  /**
   * Actualiza el contenido de un comentario. Solo lo puede hacer su autor.
   * Emite 'comment:updated' via Socket.io.
   * @param {string} userId     - ID del usuario autenticado
   * @param {string} commentId  - ID del comentario a editar
   * @param {string} content    - Nuevo contenido
   * @returns {Promise<{ message: string, comment: object }>}
   */
  async updateComment(userId, commentId, content) {
    const existing = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!existing) {
      throw Object.assign(new Error('Comment not found'), { status: 404, code: 'NOT_FOUND' });
    }
    if (existing.userId !== userId) {
      throw Object.assign(new Error('Forbidden'), { status: 403, code: 'FORBIDDEN' });
    }

    const comment = await prisma.comment.update({
      where: { id: commentId },
      data:  { content },
      select: {
        id: true,
        content: true,
        parentId: true,
        updatedAt: true,
        user: { select: USER_SELECT },
      },
    });

    try { getIO().emit('comment:updated', comment); } catch { /* sin Socket.io en tests */ }

    return { message: 'Comment updated', comment };
  }

  /**
   * Elimina un comentario. Solo lo puede hacer su autor.
   * Emite 'comment:deleted' via Socket.io con { id, parentId }.
   * @param {string} userId     - ID del usuario autenticado
   * @param {string} commentId  - ID del comentario a eliminar
   * @returns {Promise<{ message: string }>}
   */
  async deleteComment(userId, commentId) {
    const existing = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!existing) {
      throw Object.assign(new Error('Comment not found'), { status: 404, code: 'NOT_FOUND' });
    }
    if (existing.userId !== userId) {
      throw Object.assign(new Error('Forbidden'), { status: 403, code: 'FORBIDDEN' });
    }

    await prisma.comment.delete({ where: { id: commentId } });

    try { getIO().emit('comment:deleted', { id: commentId, parentId: existing.parentId }); } catch { /* sin Socket.io en tests */ }

    return { message: 'Comment deleted' };
  }

  /**
   * Crea un comentario raiz o una respuesta a otro comentario.
   * Emite 'comment:new' via Socket.io para actualizaciones en tiempo real.
   * @param {string} userId   - ID del autor autenticado
   * @param {string} content  - Texto del comentario
   * @param {string|null} parentId - ID del comentario padre (null = raiz)
   * @returns {Promise<{ message: string, comment: object }>}
   */
  async createComment(userId, content, parentId = null) {
    const comment = await prisma.comment.create({
      data: { content, userId, parentId },
      select: {
        id: true,
        content: true,
        parentId: true,
        createdAt: true,
        user: { select: USER_SELECT },
      },
    });

    // Difunde el comentario a todos los clientes conectados
    try {
      getIO().emit('comment:new', comment);
    } catch {
      // Socket.io no inicializado (ej. durante tests) — ignorar
    }

    return { message: 'Comment created successfully', comment };
  }
}

module.exports = new FeedService();
