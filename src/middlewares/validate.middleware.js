'use strict';

/**
 * Factory that returns a request body validation middleware using a Zod schema.
 * Validated data is stored in req.validatedBody to avoid re-parsing downstream.
 *
 * @param {import('zod').ZodSchema} schema
 * @returns {import('express').RequestHandler}
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: result.error.issues[0]?.message || 'Invalid request data',
      details: result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    });
  }

  req.validatedBody = result.data;
  next();
};

module.exports = { validate };
