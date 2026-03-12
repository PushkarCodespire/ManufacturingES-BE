const express = require('express');
const router  = express.Router();
const {
  getLifeDashboard,
  getAlerts,
  acknowledgeAlert,
  approveLifeExtension,
  getLifeStatus,
  updateLifeConfig,
  requestLifeExtension,
} = require('../modules/mold/controller/moldLife.controller');
const { authenticate } = require('../config/middleware');

router.use(authenticate);

router.get( '/dashboard',                  getLifeDashboard);
router.get( '/alerts',                     getAlerts);
router.post('/alerts/:alertId/acknowledge', acknowledgeAlert);
router.post('/extensions/:extId/approve',  approveLifeExtension);
router.get( '/:moldId/status',             getLifeStatus);
router.put( '/:moldId/config',             updateLifeConfig);
router.post('/:moldId/extend',             requestLifeExtension);

module.exports = router;
