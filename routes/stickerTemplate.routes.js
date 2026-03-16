const express = require('express');
const router  = express.Router();
const { getAll, getById, create, update, remove, render } = require('../modules/masters/controller/stickerTemplate.controller');
const { authenticate, authorize } = require('../config/middleware');

router.use(authenticate);

router.get('/',    getAll);
router.get('/:id', getById);
router.post('/',   authorize('plant_head', 'it_admin', 'production_manager', 'store_manager', 'dispatch_manager'), create);
router.patch('/:id', authorize('plant_head', 'it_admin', 'production_manager', 'store_manager', 'dispatch_manager'), update);
router.post('/:id/render', render);
router.delete('/:id',      authorize('plant_head', 'it_admin'), remove);

module.exports = router;
