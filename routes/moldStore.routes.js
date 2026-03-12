const express = require('express');
const router  = express.Router();
const {
  getDashboard,
  getRackMap,
  getMovementForecast,
  updateLocation,
} = require('../modules/mold/controller/moldStore.controller');
const { authenticate } = require('../config/middleware');

router.use(authenticate);

router.get( '/dashboard',         getDashboard);
router.get( '/rack-map',          getRackMap);
router.get( '/movement-forecast', getMovementForecast);
router.patch('/:moldId/location', updateLocation);

module.exports = router;
