const express = require('express');
const router  = express.Router();
const {
  getAllSites,
  getSiteById,
  createSite,
  updateSite,
  toggleSiteStatus,
} = require('../modules/masters/controller/site.controller');
const { authenticate, authorize, tenantScope } = require('../config/middleware');

// All site routes require authentication
router.use(authenticate, tenantScope);

router.get( '/',              getAllSites);
router.post('/',    authorize('plant_head', 'it_admin'), createSite);
router.get( '/:id',           getSiteById);
router.patch('/:id',          authorize('plant_head', 'it_admin'), updateSite);
router.patch('/:id/toggle',   authorize('plant_head', 'it_admin'), toggleSiteStatus);

module.exports = router;
