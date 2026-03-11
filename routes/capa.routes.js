const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/quality/controller/capa.controller');

const qualityRoles = ['plant_head', 'it_admin', 'quality_manager', 'quality_incharge'];

router.use(authenticate);

router.get('/',                      ctrl.getAll);
router.get('/effectiveness/overdue',  ctrl.getOverdueEffectiveness);
router.get('/:id',                   ctrl.getById);
router.post('/',                     authorize(...qualityRoles), ctrl.create);
router.patch('/:id',                 authorize(...qualityRoles), ctrl.update);
router.put('/:id/d4',                authorize(...qualityRoles), ctrl.updateD4);
router.put('/:id/d5d6',              authorize(...qualityRoles), ctrl.updateD5D6);
router.post('/:id/effectiveness',    authorize(...qualityRoles), ctrl.addEffectiveness);
router.patch('/:id/close',           authorize(...qualityRoles), ctrl.close);
router.post('/:id/ai/root-cause',              authorize(...qualityRoles), ctrl.aiRootCause);
router.post('/:id/ai/effectiveness-prediction', authorize(...qualityRoles), ctrl.aiEffectivenessPrediction);
router.delete('/:id',                authorize(...qualityRoles), ctrl.delete);

module.exports = router;
