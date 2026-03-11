const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../config/middleware');
const { getAll, getById, create, update, remove, aiSuggestPrice } = require('../modules/orders/controller/quotation.controller');

router.use(authenticate);

// AI endpoints
router.post('/ai/suggest-price', aiSuggestPrice);

router.get('/',    getAll);
router.get('/:id', getById);

// Write — planning + admin
router.post(  '/',    authorize('plant_head', 'it_admin', 'planning_manager', 'planning_incharge'), create);
router.patch( '/:id', authorize('plant_head', 'it_admin', 'planning_manager', 'planning_incharge'), update);
router.delete('/:id', authorize('plant_head', 'it_admin', 'planning_manager'),                      remove);

module.exports = router;
