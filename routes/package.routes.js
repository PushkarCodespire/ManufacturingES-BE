const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../config/middleware');
const { getAll, getById, create, update, remove } = require('../modules/masters/controller/package.controller');

// All routes require authentication
router.use(authenticate);

router.get('/',    getAll);
router.get('/:id', getById);

// Write operations — inventory managers + admins
router.post(  '/',    authorize('plant_head', 'it_admin', 'inventory_manager', 'production_manager'), create);
router.patch( '/:id', authorize('plant_head', 'it_admin', 'inventory_manager', 'production_manager'), update);
router.delete('/:id', authorize('plant_head', 'it_admin'), remove);

module.exports = router;
