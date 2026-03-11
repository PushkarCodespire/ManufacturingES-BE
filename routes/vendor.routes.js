const express = require('express');
const router  = express.Router();
const {
  getAllVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
  getVendorScorecard,
} = require('../modules/masters/controller/vendor.controller');
const { authenticate, authorize } = require('../config/middleware');

// All vendor routes require authentication
router.use(authenticate);

router.get( '/',              getAllVendors);
router.get( '/:id/scorecard', getVendorScorecard);
router.get( '/:id',           getVendorById);
router.post('/',    authorize('plant_head', 'it_admin', 'procurement_manager', 'procurement_executive'), createVendor);
router.patch('/:id', authorize('plant_head', 'it_admin', 'procurement_manager', 'procurement_executive'), updateVendor);
router.delete('/:id', authorize('plant_head', 'it_admin'), deleteVendor);

module.exports = router;
