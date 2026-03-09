const express    = require('express');
const router     = express.Router();
const { authenticate, authorize } = require('../config/middleware');
const { getAll, getById, create, update, remove } = require('../modules/masters/controller/template.controller');

// All routes require authentication
router.use(authenticate);

router.get('/',    getAll);
router.get('/:id', getById);

// Write operations — production/procurement managers + admins
router.post(  '/',    authorize('plant_head', 'it_admin', 'production_manager', 'procurement_manager'), create);
router.patch( '/:id', authorize('plant_head', 'it_admin', 'production_manager', 'procurement_manager'), update);
router.delete('/:id', authorize('plant_head', 'it_admin'), remove);

module.exports = router;
