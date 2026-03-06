const Joi = require('joi');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PASSWORD_REGEX } = require('../../../config/constants');

// ─── Validation Schemas ───────────────────────────────────────────────────────

const loginSchema = Joi.object({
  employee_id: Joi.string().trim().required().messages({
    'any.required': 'Employee ID is required',
    'string.empty': 'Employee ID cannot be empty',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
    'string.empty': 'Password cannot be empty',
  }),
});

const changePasswordSchema = Joi.object({
  current_password: Joi.string().required().messages({
    'any.required': 'Current password is required',
  }),
  new_password: Joi.string()
    .pattern(PASSWORD_REGEX)
    .required()
    .messages({
      'any.required': 'New password is required',
      'string.pattern.base':
        'Password must be at least 8 characters with at least 1 uppercase letter and 1 number',
    }),
});

// ─── Validators ───────────────────────────────────────────────────────────────

const validateLogin = (data) => loginSchema.validate(data, { abortEarly: false });
const validateChangePassword = (data) => changePasswordSchema.validate(data, { abortEarly: false });

// ─── Password Helpers ─────────────────────────────────────────────────────────

const hashPassword = (password) => bcrypt.hash(password, 10);
const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);

// ─── JWT Helpers ──────────────────────────────────────────────────────────────

const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

module.exports = {
  validateLogin,
  validateChangePassword,
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
};
