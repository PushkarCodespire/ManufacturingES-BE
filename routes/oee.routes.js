const router = require('express').Router();
const { authenticate } = require('../config/middleware');
const ctrl = require('../modules/production/controller/oee.controller');

router.use(authenticate);

router.get('/live',               ctrl.getLive);
router.get('/dashboard',          ctrl.getDashboard);
router.get('/machine/:machineId', ctrl.getMachineDetail);

module.exports = router;
