const router = require('express').Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/production/controller/scrapVoucher.controller');

const SCRAP_WRITE   = ['plant_head', 'it_admin', 'production_manager', 'production_incharge'];
const SCRAP_APPROVE = ['plant_head', 'it_admin', 'production_manager'];

router.use(authenticate);

router.get('/',                 ctrl.getAll);
router.get('/:id',              ctrl.getById);
router.post('/',                authorize(...SCRAP_WRITE),   ctrl.create);
router.patch('/:id',            authorize(...SCRAP_WRITE),   ctrl.update);
router.patch('/:id/authorize',  authorize(...SCRAP_APPROVE), ctrl.authorize);
router.patch('/:id/reject',     authorize(...SCRAP_APPROVE), ctrl.reject);
router.delete('/:id',           authorize(...SCRAP_WRITE),   ctrl.delete);

module.exports = router;
