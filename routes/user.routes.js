const express = require('express');
const router  = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  getDepartments,
  getRoles,
  getSites,
  getWarehouses,
  adminResetPassword,
  toggleUserStatus,
} = require('../modules/user/controller/user.controller');
const { authenticate, authorize, tenantScope } = require('../config/middleware');

// H-07 / M-06: Roles allowed to read the employee directory and the roles list.
// Operators and viewers have no legitimate need to enumerate employees or system roles.
const USER_READ_ROLES = [
  'plant_head', 'it_admin',
  'store_manager', 'store_incharge',
  'production_manager', 'production_incharge',
  'quality_manager', 'quality_incharge',
  'planning_manager', 'planning_incharge',
  'procurement_manager', 'dispatch_manager',
  'accounts_manager', 'hr_manager',
];

// All user routes require authentication + tenant scope
router.use(authenticate, tenantScope);

// ── Lookup routes ────────────────────────────────────────────────────────────
// IMPORTANT: these must come before /:id to avoid being matched as a param
// /departments, /sites, /warehouses — open to all authenticated users (needed by forms across all roles)
// /roles — M-06: restricted; operators/viewers have no need to enumerate system roles
router.get('/departments', getDepartments);
router.get('/sites',       getSites);
router.get('/warehouses',  getWarehouses);
router.get('/roles',       authorize(...USER_READ_ROLES), getRoles);

// ── Read — management / incharge roles only ───────────────────────────────────
router.get('/',    authorize(...USER_READ_ROLES), getAllUsers);
router.get('/:id', authorize(...USER_READ_ROLES), getUserById);

// ── Write — admin only ───────────────────────────────────────────────────────
router.post('/',             authorize('plant_head', 'it_admin'), createUser);
router.patch('/:id',         authorize('plant_head', 'it_admin'), updateUser);
router.patch('/:id/toggle',  authorize('plant_head', 'it_admin'), toggleUserStatus);

// ── SYS-003: Reset password ───────────────────────────────────────────────────
router.post('/reset-password', authorize('plant_head', 'it_admin'), adminResetPassword);

module.exports = router;
