'use strict';
const router = require('express').Router();
const ctrl   = require('../modules/maintenance/controller/spareParts.controller');
const cred   = require('../modules/maintenance/cred/spareParts.cred');
const { authenticate } = require('../config/middleware');

router.use(authenticate);

router.get('/',             ctrl.getSpareParts);
router.post('/',            cred.createSparePart, ctrl.createSparePart);
router.patch('/:id',        ctrl.updateSparePart);
router.get('/bom/:equipId', ctrl.getBomForEquipment);
router.post('/bom/:equipId',cred.addBomItem, ctrl.addBomItem);
router.delete('/bom/:equipId/:bomId', ctrl.removeBomItem);
router.post('/consume',     cred.consumePart, ctrl.consumePart);
router.get('/consumption/:partId', ctrl.getConsumptionHistory);

module.exports = router;
