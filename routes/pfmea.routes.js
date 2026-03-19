const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/npd/controller/pfmea.controller');

const npdRoles = ['plant_head', 'it_admin', 'quality_manager', 'quality_incharge'];

router.use(authenticate);

// PFMEA headers
router.get('/',                               ctrl.getAll);
router.get('/:id',                            ctrl.getById);
router.post('/',                              authorize(...npdRoles), ctrl.create);
router.patch('/:id',                          authorize(...npdRoles), ctrl.update);
router.post('/:id/ai/failure-mode-suggestion', authorize(...npdRoles), ctrl.aiFailureModeSuggestion);
router.delete('/:id',                         authorize(...npdRoles), ctrl.delete);

// Items (process steps)
router.post('/:id/items',                              authorize(...npdRoles), ctrl.addItem);
router.patch('/:id/items/:itemId',                     authorize(...npdRoles), ctrl.updateItem);
router.delete('/:id/items/:itemId',                    authorize(...npdRoles), ctrl.deleteItem);

// Actions per item
router.post('/:id/items/:itemId/actions',              authorize(...npdRoles), ctrl.addAction);
router.patch('/:id/items/:itemId/actions/:actionId',   authorize(...npdRoles), ctrl.updateAction);

module.exports = router;
