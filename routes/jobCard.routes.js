const router = require('express').Router();
const { authenticate, authorize, requirePermission } = require('../config/middleware');
const ctrl = require('../modules/production/controller/jobCard.controller');

const JC_WRITE  = ['plant_head', 'it_admin', 'production_manager', 'production_incharge', 'operator'];
const JC_MANAGE = ['plant_head', 'it_admin', 'production_manager', 'production_incharge'];

// H-01: granular permission key backing the job cards feature
const JC_PERM = 'prod-dpr-daily_production_report-create_edit_delete';

router.use(authenticate);

router.get('/active-idle',   ctrl.getActiveIdle);
router.get('/',             ctrl.getAll);
router.get('/:id',          ctrl.getById);
router.post('/',            authorize(...JC_WRITE),  requirePermission(JC_PERM), ctrl.create);
router.patch('/:id',        authorize(...JC_WRITE),  requirePermission(JC_PERM), ctrl.update);
router.patch('/:id/close',  authorize(...JC_WRITE),  requirePermission(JC_PERM), ctrl.close);
router.patch('/:id/cancel', authorize(...JC_MANAGE), requirePermission(JC_PERM), ctrl.cancel);
router.delete('/:id',       authorize(...JC_MANAGE), requirePermission(JC_PERM), ctrl.delete);

module.exports = router;
