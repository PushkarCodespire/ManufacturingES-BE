const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/accounts/controller/copqEntry.controller');

const writeRoles = ['plant_head', 'it_admin', 'accounts_manager', 'accounts_incharge', 'quality_manager'];

router.use(authenticate);

router.get('/summary',       ctrl.summary);
router.get('/ai-narrative',  ctrl.getAiNarrative);   // AI: COPQ management narrative
router.get('/',              ctrl.getAll);
router.get('/:id',           ctrl.getById);
router.post('/',       authorize(...writeRoles), ctrl.create);
router.patch('/:id',   authorize(...writeRoles), ctrl.update);
router.delete('/:id',  authorize(...writeRoles), ctrl.delete);

module.exports = router;
