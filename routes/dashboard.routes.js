const router = require('express').Router();
const { authenticate, tenantScope } = require('../config/middleware');
const ctrl = require('../modules/production/controller/dashboard.controller');

router.use(authenticate, tenantScope);

router.get('/full',            ctrl.getFullDashboard);
router.get('/kpis',            ctrl.getKpis);
router.get('/multi-plant',     ctrl.getMultiPlant);
router.get('/role-stats/:role', ctrl.getRoleStats);

module.exports = router;
