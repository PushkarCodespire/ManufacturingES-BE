const express = require('express');
const router  = express.Router();
const {
  getAllParameters,
  createParameter,
  bulkCreateParameters,
  deleteParameter,
} = require('../modules/masters/controller/productionParameter.controller');
const { authenticate, authorize } = require('../config/middleware');

router.use(authenticate);

router.get( '/',              getAllParameters);
router.post('/',    authorize('plant_head', 'it_admin'), createParameter);
router.post('/bulk', authorize('plant_head', 'it_admin'), bulkCreateParameters);
router.delete('/:id', authorize('plant_head', 'it_admin'), deleteParameter);

module.exports = router;
