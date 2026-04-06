const Joi = require('joi');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PASSWORD_REGEX } = require('../../../config/constants');

// ─── Validation Schemas ───────────────────────────────────────────────────────

/**
 * Login — accepts employee_id OR email (at least one required, not both mandatory).
 * Existing login with employee_id continues to work unchanged.
 */
const loginSchema = Joi.object({
  employee_id: Joi.string().trim().messages({
    'string.empty': 'Employee ID cannot be empty',
  }),
  email: Joi.string().trim().email().messages({
    'string.email': 'Please provide a valid email address',
    'string.empty': 'Email cannot be empty',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
    'string.empty': 'Password cannot be empty',
  }),
}).or('employee_id', 'email').messages({
  'object.missing': 'Either Employee ID or Email is required',
});

/**
 * Registration — self-service company signup.
 */
const registerSchema = Joi.object({
  company_name: Joi.string().trim().min(2).max(200).required().messages({
    'any.required': 'Company name is required',
    'string.empty': 'Company name cannot be empty',
    'string.min':   'Company name must be at least 2 characters',
    'string.max':   'Company name must not exceed 200 characters',
  }),
  name: Joi.string().trim().min(2).max(100).required().messages({
    'any.required': 'Your name is required',
    'string.empty': 'Name cannot be empty',
    'string.min':   'Name must be at least 2 characters',
  }),
  email: Joi.string().trim().email().required().messages({
    'any.required': 'Email is required',
    'string.email': 'Please provide a valid email address',
  }),
  phone: Joi.string().trim().max(15).allow('', null).optional(),
  password: Joi.string()
    .pattern(PASSWORD_REGEX)
    .required()
    .messages({
      'any.required':        'Password is required',
      'string.pattern.base': 'Password must be at least 8 characters with at least 1 uppercase letter and 1 number',
    }),
  industry: Joi.string().trim().max(100).allow('', null).optional(),
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
const validateRegister = (data) => registerSchema.validate(data, { abortEarly: false });
const validateChangePassword = (data) => changePasswordSchema.validate(data, { abortEarly: false });

// ─── Password Helpers ─────────────────────────────────────────────────────────

const hashPassword = (password) => bcrypt.hash(password, 10);
const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);

// ─── JWT Helpers ──────────────────────────────────────────────────────────────

/**
 * Generate JWT access token.
 * Payload now includes organization_id for tenant-aware routes.
 */
const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

module.exports = {
  validateLogin,
  validateRegister,
  validateChangePassword,
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
};
