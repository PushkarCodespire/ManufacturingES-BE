const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/quality/controller/ppap.controller');

const QC_MANAGE = ['plant_head', 'it_admin', 'quality_manager', 'quality_incharge'];

router.use(authenticate);

router.get('/',                              ctrl.getAll);
router.get('/:id',                           ctrl.getById);
router.post('/',                             authorize(...QC_MANAGE), ctrl.create);
router.patch('/:id/element/:elementId',      authorize(...QC_MANAGE), ctrl.updateElement);
router.patch('/:id/sign-psw',               authorize(...QC_MANAGE), ctrl.signPsw);
router.patch('/:id/approve',                authorize('plant_head', 'it_admin', 'quality_manager'), ctrl.approve);
router.patch('/:id/reject',                 authorize('plant_head', 'it_admin', 'quality_manager'), ctrl.reject);
router.delete('/:id',                        authorize(...QC_MANAGE), ctrl.delete);

module.exports = router;
