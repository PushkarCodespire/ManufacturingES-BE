const express = require('express');
const router  = express.Router();
const {
  getAllCostings,
  createCostings,
  updateCosting,
  deleteCosting,
} = require('../modules/masters/controller/vendorCosting.controller');
const { authenticate, authorize } = require('../config/middleware');

// All costing routes require authentication
router.use(authenticate);

router.get( '/',    getAllCostings);
router.post('/',    authorize('plant_head', 'it_admin', 'procurement_manager', 'procurement_executive'), createCostings);
router.patch('/:id', authorize('plant_head', 'it_admin', 'procurement_manager', 'procurement_executive'), updateCosting);
router.delete('/:id', authorize('plant_head', 'it_admin'), deleteCosting);

module.exports = router;
