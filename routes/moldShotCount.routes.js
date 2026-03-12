const express = require('express');
const router  = express.Router();
const {
  getDashboard,
  calculateShots,
  getShotHistory,
  adjustShotCount,
} = require('../modules/mold/controller/moldShotCount.controller');
const { authenticate } = require('../config/middleware');

router.use(authenticate);

router.get( '/dashboard',           getDashboard);
router.post('/calculate/:jobCardId', calculateShots);
router.get( '/:moldId/history',     getShotHistory);
router.post('/:moldId/adjust',      adjustShotCount);

module.exports = router;
