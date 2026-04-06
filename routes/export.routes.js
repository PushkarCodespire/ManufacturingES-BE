'use strict';

const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/admin/controller/export.controller');

const adminRoles = ['plant_head', 'it_admin'];

router.use(authenticate);

// POST — trigger export (admin only)
router.post('/', authorize(...adminRoles), ctrl.triggerExport);

// GET — list exports
router.get('/', ctrl.listExports);

// GET — single export
router.get('/:id', ctrl.getExport);

// GET — download export file
router.get('/:id/download', ctrl.downloadExport);

module.exports = router;
