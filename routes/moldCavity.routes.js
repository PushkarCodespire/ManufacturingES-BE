const express = require('express');
const router  = express.Router();
const {
  getCavities,
  createCavity,
  blockCavity,
  unblockCavity,
  getCavityHeatmap,
} = require('../modules/mold/controller/moldCavity.controller');
const { authenticate } = require('../config/middleware');

router.use(authenticate);

router.get( '/:moldId/cavities',                getCavities);
router.post('/:moldId/cavities',                createCavity);
router.post('/:moldId/cavities/:cavId/block',   blockCavity);
router.post('/:moldId/cavities/:cavId/unblock', unblockCavity);
router.get( '/:moldId/cavity-heatmap',          getCavityHeatmap);

module.exports = router;
