'use strict';
const router     = require('express').Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl       = require('../modules/production/controller/laborLog.controller');

const WRITE_ROLES = ['plant_head', 'it_admin', 'production_manager', 'production_supervisor'];

router.use(authenticate);

// Aggregated summary — must come before /:id
router.get('/summary', ctrl.getSummary);

router.get('/',    ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/',   authorize(...WRITE_ROLES), ctrl.create);
router.put('/:id', authorize(...WRITE_ROLES), ctrl.update);
router.delete('/:id', authorize('plant_head', 'it_admin', 'production_manager'), ctrl.remove);

module.exports = router;
