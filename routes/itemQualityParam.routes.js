const router = require('express').Router({ mergeParams: true });
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/masters/controller/itemQualityParam.controller');

const QC_WRITE = ['plant_head', 'it_admin', 'quality_manager', 'quality_incharge'];

router.use(authenticate);

router.get('/',             ctrl.getByItemId);
router.post('/',            authorize(...QC_WRITE), ctrl.bulkSave);
router.delete('/:paramId',  authorize(...QC_WRITE), ctrl.deleteParam);

module.exports = router;
