const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/quality/controller/complaint.controller');

const qualityRoles = ['plant_head', 'it_admin', 'quality_manager', 'quality_incharge'];

router.use(authenticate);

router.get('/',                  ctrl.getAll);
router.get('/overdue',           ctrl.getOverdue);      // M-03: must be before /:id
router.get('/:id/ai-summary',    ctrl.getAiSummary);    // AI: closure summary
router.get('/:id',               ctrl.getById);
router.post('/',                         authorize(...qualityRoles), ctrl.create);
router.patch('/:id',                     authorize(...qualityRoles), ctrl.update);
router.patch('/:id/acknowledge',         authorize(...qualityRoles), ctrl.acknowledge);
router.delete('/:id',                    authorize(...qualityRoles), ctrl.delete);

module.exports = router;
