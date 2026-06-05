'use strict';

const { z } = require('zod');

/** Reusable password schema applying OWASP ASVS Level 2 complexity rules */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter and one number'
  );

/** Valid security-question keys — must match the frontend's I18n keys */
const SECURITY_QUESTION_KEYS = ['q0', 'q1', 'q2', 'q3', 'q4'];

/** Schema for POST /register */
const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .regex(
      /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/,
      'Name cannot contain numbers or special characters'
    ),
  email: z.string().email('Invalid email format'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Username can only contain letters, numbers and underscores'
    ),
  password: passwordSchema,
  securityQuestion: z.enum(SECURITY_QUESTION_KEYS, {
    errorMap: () => ({ message: 'Invalid security question' }),
  }),
  securityAnswer: z
    .string()
    .min(2, 'Security answer must be at least 2 characters')
    .max(100, 'Security answer cannot exceed 100 characters'),
});

/** Schema for POST /login */
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

/** Schema for PUT /change-password */
const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: passwordSchema,
});

/** Schema for POST /feed (create comment or reply) */
const commentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment content cannot be empty')
    .max(1000, 'Comment cannot exceed 1000 characters'),
  parentId: z.string().uuid('Invalid parentId format').optional(),
});

/** Schema for PUT /feed/:id (editar comentario) */
const editCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment content cannot be empty')
    .max(1000, 'Comment cannot exceed 1000 characters'),
});

/** Schema for POST /forgot-password */
const forgotPasswordSchema = z.object({
  username:       z.string().min(1, 'Username is required'),
  securityAnswer: z.string().min(1, 'Security answer is required'),
  newPassword:    passwordSchema,
});

/** Schema for PUT /me/name (cambiar nombre) */
const nameSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name cannot exceed 60 characters')
    .regex(
      /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/,
      'Name cannot contain numbers or special characters'
    ),
});

module.exports = {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  commentSchema,
  editCommentSchema,
  nameSchema,
  forgotPasswordSchema,
};
