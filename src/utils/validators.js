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

/** Schema for POST /feed (create comment) */
const commentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment content cannot be empty')
    .max(1000, 'Comment cannot exceed 1000 characters'),
});

module.exports = {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  commentSchema,
};
