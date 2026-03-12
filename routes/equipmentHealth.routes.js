'use strict';
const router = require('express').Router();
const ctrl   = require('../modules/maintenance/controller/equipmentHealth.controller');
const { authenticate } = require('../config/middleware');

router.use(authenticate);

router.get('/dashboard',            ctrl.getDashboard);
router.get('/:id/score',            ctrl.getHealthScore);
router.post('/:id/calculate',       ctrl.calculateHealthScore);

module.exports = router;
