const router = require('express').Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/production/controller/toolManagement.controller');

const WRITE = ['plant_head', 'it_admin', 'production_manager', 'production_incharge', 'operator'];

router.use(authenticate);

router.get('/summary',          ctrl.getSummary);
router.get('/tool/:toolId',     ctrl.getByTool);
router.get('/',                 ctrl.getAll);
router.post('/',  authorize(...WRITE), ctrl.logUsage);
router.delete('/:id', authorize('plant_head', 'it_admin', 'production_manager'), ctrl.deleteLog);

module.exports = router;
