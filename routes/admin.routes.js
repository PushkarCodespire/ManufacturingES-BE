const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/admin/controller/admin.controller');

const adminRoles = ['plant_head', 'it_admin'];

router.use(authenticate);
router.use(authorize(...adminRoles));

// Module toggles
router.get('/modules',             ctrl.getModules);
router.patch('/modules/:id',       ctrl.toggleModule);

// Feature toggles
router.get('/features',            ctrl.getFeatures);
router.patch('/features/:id',      ctrl.toggleFeature);

// Role permissions
router.get('/roles',               ctrl.getRoles);
router.get('/role-permissions/:roleId', ctrl.getRolePermissionGrid);
router.put('/role-permissions/:roleId', ctrl.updateRolePermissions);

// User overrides
router.get('/user-overrides',      ctrl.searchUsers);
router.get('/user-overrides/:userId', ctrl.getUserOverrides);
router.put('/user-overrides/:userId', ctrl.updateUserOverride);

// AI agents
router.get('/ai-agents',           ctrl.getAiAgents);
router.patch('/ai-agents/:id',     ctrl.toggleAiAgent);

// Field visibility
router.get('/field-visibility/:featureKey', ctrl.getFieldVisibility);
router.put('/field-visibility/:featureKey', ctrl.updateFieldVisibility);

// Audit log
router.get('/audit-log',           ctrl.getAuditLog);

module.exports = router;
