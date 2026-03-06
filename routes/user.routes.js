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
const { authenticate, authorize } = require('../config/middleware');

// All user routes require authentication
router.use(authenticate);

// ── Lookup routes (any authenticated user — used by forms) ───────────────────
// IMPORTANT: these must come before /:id to avoid being matched as a param
router.get('/departments', getDepartments);
router.get('/roles',       getRoles);
router.get('/sites',       getSites);
router.get('/warehouses',  getWarehouses);

// ── Employee management (IT Admin / Plant Head only) ─────────────────────────
router.get( '/',     authorize('plant_head', 'it_admin'), getAllUsers);
router.post('/',     authorize('plant_head', 'it_admin'), createUser);
router.get(  '/:id',         authorize('plant_head', 'it_admin'), getUserById);
router.patch('/:id',         authorize('plant_head', 'it_admin'), updateUser);
router.patch('/:id/toggle',  authorize('plant_head', 'it_admin'), toggleUserStatus);

// ── SYS-003: Reset password ───────────────────────────────────────────────────
router.post('/reset-password', authorize('plant_head', 'it_admin'), adminResetPassword);

module.exports = router;
