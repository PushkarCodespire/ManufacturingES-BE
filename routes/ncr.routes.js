const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/quality/controller/ncr.controller');

const qualityRoles = ['plant_head', 'it_admin', 'quality_manager', 'quality_incharge'];

router.use(authenticate);

router.get('/',                      ctrl.getAll);
router.get('/:id/ai-suggestion',     ctrl.getAiSuggestion);   // AI: root-cause suggestion
router.get('/:id',                   ctrl.getById);
router.post('/',                     authorize(...qualityRoles), ctrl.create);
router.patch('/:id',                 authorize(...qualityRoles), ctrl.update);
router.post('/:id/disposition',      authorize(...qualityRoles), ctrl.addDisposition);
router.patch('/:id/close',           authorize(...qualityRoles), ctrl.close);
router.delete('/:id',                authorize(...qualityRoles), ctrl.delete);

module.exports = router;
