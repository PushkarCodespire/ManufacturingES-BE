const router = require('express').Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/procurement/controller/vendorRfq.controller');

const RFQ_WRITE   = ['plant_head', 'it_admin', 'procurement_manager'];
const RFQ_APPROVE = ['plant_head', 'it_admin', 'procurement_manager'];

router.use(authenticate);

router.get('/',          ctrl.getAll);
router.get('/:id',       ctrl.getById);

router.post('/',                  authorize(...RFQ_WRITE),   ctrl.create);
router.patch('/:id',              authorize(...RFQ_WRITE),   ctrl.update);
router.patch('/:id/send',         authorize(...RFQ_WRITE),   ctrl.send);
router.patch('/:id/close',        authorize(...RFQ_WRITE),   ctrl.close);
router.post('/:id/quotes',        authorize(...RFQ_WRITE),   ctrl.saveQuotes);
router.post('/:id/award',         authorize(...RFQ_APPROVE), ctrl.award);
router.delete('/:id',             authorize(...RFQ_WRITE),   ctrl.delete);

module.exports = router;
