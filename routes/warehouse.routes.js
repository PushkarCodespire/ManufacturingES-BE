const express = require('express');
const router  = express.Router();
const {
  getAllWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
} = require('../modules/masters/controller/warehouse.controller');
const { authenticate, authorize } = require('../config/middleware');

// All warehouse routes require authentication
router.use(authenticate);

router.get( '/',              getAllWarehouses);
router.post('/',    authorize('plant_head', 'it_admin'), createWarehouse);
router.get( '/:id',           getWarehouseById);
router.patch('/:id',          authorize('plant_head', 'it_admin'), updateWarehouse);
router.delete('/:id',         authorize('plant_head', 'it_admin'), deleteWarehouse);

module.exports = router;
