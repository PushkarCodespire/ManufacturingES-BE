const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../config/middleware');
const { getAll, getById, getTracking, create, update, remove } = require('../modules/orders/controller/customerOrder.controller');

router.use(authenticate);

// Tracking dashboard — any authenticated user can view
router.get('/tracking', getTracking);

router.get('/',    getAll);
router.get('/:id', getById);

// Write — planning + admin
router.post(  '/',    authorize('plant_head', 'it_admin', 'planning_manager', 'planning_incharge'), create);
router.patch( '/:id', authorize('plant_head', 'it_admin', 'planning_manager', 'planning_incharge'), update);
router.delete('/:id', authorize('plant_head', 'it_admin', 'planning_manager'),                      remove);

module.exports = router;
