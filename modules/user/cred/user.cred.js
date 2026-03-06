const Joi = require('joi');

// Validation for user ID route param
const userIdSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'User ID must be a number',
    'any.required': 'User ID is required',
  }),
});

// Validation for admin reset password body
const adminResetSchema = Joi.object({
  employee_id: Joi.string().trim().required().messages({
    'any.required': 'Employee ID is required',
  }),
});

// Valid landing page keys (must match sidebar nav keys)
const LANDING_PAGES = [
  'dashboard', 'iqc', 'procurement', 'store',
  'production', 'dispatch', 'accounts', 'hr',
];

// Validation for creating a new employee
const createUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.min':  'Name must be at least 2 characters',
    'any.required':'Name is required',
  }),
  email: Joi.string().email({ tlds: { allow: false } }).lowercase().trim().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required',
  }),
  phone: Joi.string().trim().pattern(/^[0-9+\-\s]{7,15}$/).optional().allow('', null).messages({
    'string.pattern.base': 'Enter a valid phone number (7-15 digits)',
  }),
  department_id: Joi.number().integer().positive().required().messages({
    'any.required': 'Department is required',
  }),
  role_id: Joi.number().integer().positive().required().messages({
    'any.required': 'Role is required',
  }),
  // Multi-site & warehouse access
  site_ids: Joi.array()
    .items(Joi.number().integer().positive())
    .optional()
    .allow(null)
    .default([]),
  warehouse_ids: Joi.array()
    .items(Joi.number().integer().positive())
    .optional()
    .allow(null)
    .default([]),
  // Preferred landing page after login
  landing_page: Joi.string()
    .valid(...LANDING_PAGES)
    .optional()
    .default('dashboard'),
});

// Validation for updating an existing employee (all fields optional)
const updateUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  email: Joi.string().email({ tlds: { allow: false } }).lowercase().trim().optional(),
  phone: Joi.string().trim().pattern(/^[0-9+\-\s]{7,15}$/).optional().allow('', null),
  department_id: Joi.number().integer().positive().optional(),
  role_id: Joi.number().integer().positive().optional(),
  site_ids: Joi.array().items(Joi.number().integer().positive()).optional().allow(null).default([]),
  warehouse_ids: Joi.array().items(Joi.number().integer().positive()).optional().allow(null).default([]),
  landing_page: Joi.string().valid(...LANDING_PAGES).optional(),
  // Flat array of permission tree keys (from Employee Detail access tabs)
  permissions: Joi.array().items(Joi.string().trim()).optional().default([]),
});

const validateUserId     = (data) => userIdSchema.validate(data,     { abortEarly: false });
const validateAdminReset = (data) => adminResetSchema.validate(data, { abortEarly: false });
const validateCreateUser = (data) => createUserSchema.validate(data, { abortEarly: false });
const validateUpdateUser = (data) => updateUserSchema.validate(data, { abortEarly: false });

module.exports = { validateUserId, validateAdminReset, validateCreateUser, validateUpdateUser };
