const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../config/middleware');
const { getAll, getById, create, update, remove } = require('../modules/masters/controller/report.controller');

router.use(authenticate);

router.get('/',    getAll);
router.get('/:id', getById);

router.post(  '/',    authorize('plant_head', 'it_admin', 'production_manager', 'quality_manager'), create);
router.patch( '/:id', authorize('plant_head', 'it_admin', 'production_manager', 'quality_manager'), update);
router.delete('/:id', authorize('plant_head', 'it_admin'), remove);

module.exports = router;
