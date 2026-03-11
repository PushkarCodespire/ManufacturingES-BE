const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/quality/controller/instrument.controller');

const QC_ROLES  = ['plant_head', 'it_admin', 'quality_manager', 'quality_incharge', 'iqc_inspector'];
const QC_MANAGE = ['plant_head', 'it_admin', 'quality_manager'];

router.use(authenticate);

// Verification status must come before /:id to avoid route collision
router.get('/verification-status', authorize(...QC_ROLES), ctrl.getVerificationStatus);

router.get('/',                    ctrl.getAll);
router.get('/:id',                 ctrl.getById);
router.post('/',                   authorize(...QC_MANAGE), ctrl.create);
router.patch('/:id',               authorize(...QC_MANAGE), ctrl.update);
router.delete('/:id',              authorize(...QC_MANAGE), ctrl.delete);
router.post('/:id/verify',         authorize(...QC_ROLES),  ctrl.verify);

module.exports = router;
