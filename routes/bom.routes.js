const express = require('express');
const router  = express.Router();
const {
  getAllBoms,
  getBomByItemId,
  createOrUpdateBom,
  finalizeBom,
  deleteBom,
} = require('../modules/masters/controller/bom.controller');
const { authenticate, authorize } = require('../config/middleware');

router.use(authenticate);

router.get( '/',              getAllBoms);
router.get( '/item/:itemId',  getBomByItemId);
router.post('/',    authorize('plant_head', 'it_admin'), createOrUpdateBom);
router.post('/:id/finalize',  authorize('plant_head', 'it_admin'), finalizeBom);
router.delete('/:id',         authorize('plant_head', 'it_admin'), deleteBom);

module.exports = router;
