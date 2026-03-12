const express = require('express');
const router  = express.Router();
const { authenticate } = require('../config/middleware');
const ctrl = require('../modules/mold/controller/moldRepair.controller');

router.use(authenticate);

// Repair Types (master data)
router.get('/types',                         ctrl.getRepairTypes);
router.post('/types',                        ctrl.createRepairType);

// Repair Requests
router.get('/requests',                      ctrl.getRepairRequests);
router.get('/requests/:id',                  ctrl.getRepairById);
router.post('/:moldId/request',              ctrl.createRequest);
router.patch('/requests/:id/approve',        ctrl.approveRequest);
router.post('/requests/:id/track',           ctrl.addTracking);
router.post('/requests/:id/costs',           ctrl.addCost);
router.patch('/requests/:id/complete',       ctrl.completeRepair);

module.exports = router;
