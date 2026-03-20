const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/quality/controller/auditPlan.controller');

const QC_ROLES  = ['plant_head', 'it_admin', 'quality_manager', 'quality_incharge'];
const QC_MANAGE = ['plant_head', 'it_admin', 'quality_manager'];

router.use(authenticate);

router.get('/',                                   ctrl.getAll);
router.get('/:id',                                ctrl.getById);
router.post('/',                                  authorize(...QC_MANAGE), ctrl.create);
router.patch('/:id/approve',                      authorize(...QC_MANAGE), ctrl.approve);
router.delete('/:id',                             authorize(...QC_MANAGE), ctrl.delete);

// Audit items
router.post('/:id/items',                         authorize(...QC_ROLES),  ctrl.addItem);
router.patch('/items/:itemId/execute',            authorize(...QC_ROLES),  ctrl.executeItem);

// Audit findings
router.post('/items/:itemId/findings',            authorize(...QC_ROLES),  ctrl.addFinding);

module.exports = router;
