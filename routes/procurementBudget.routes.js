const router = require('express').Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/procurement/controller/procurementBudget.controller');

const BUDGET_WRITE = ['plant_head', 'it_admin', 'procurement_manager'];

router.use(authenticate);

router.get('/summary',  ctrl.getSummary);
router.get('/',         ctrl.getAll);
router.get('/:id',      ctrl.getById);

router.post('/',        authorize(...BUDGET_WRITE), ctrl.create);
router.patch('/:id',    authorize(...BUDGET_WRITE), ctrl.update);
router.patch('/:id/close', authorize(...BUDGET_WRITE), ctrl.close);
router.delete('/:id',   authorize(...BUDGET_WRITE), ctrl.delete);

module.exports = router;
