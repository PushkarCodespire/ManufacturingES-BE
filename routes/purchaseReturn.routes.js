'use strict';

const router     = require('express').Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/procurement/controller/purchaseReturn.controller');

const WRITE  = ['plant_head', 'it_admin', 'procurement_manager', 'store_manager', 'store_incharge'];
const MANAGE = ['plant_head', 'it_admin', 'procurement_manager'];

router.get('/',              authenticate, ctrl.getAll);
router.get('/:id',           authenticate, ctrl.getById);
router.get('/po/:po_id/grn-items', authenticate, ctrl.getPoGrnItems);
router.post('/',             authenticate, authorize(...WRITE),  ctrl.create);
router.patch('/:id',         authenticate, authorize(...WRITE),  ctrl.update);
router.patch('/:id/send',    authenticate, authorize(...WRITE),  ctrl.send);
router.patch('/:id/acknowledge', authenticate, authorize(...MANAGE), ctrl.acknowledge);
router.patch('/:id/close',   authenticate, authorize(...MANAGE), ctrl.close);
router.delete('/:id',        authenticate, authorize(...MANAGE), ctrl.delete);

module.exports = router;
