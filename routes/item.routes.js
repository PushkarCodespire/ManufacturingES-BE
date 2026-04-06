const express = require('express');
const router  = express.Router();
const {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
} = require('../modules/masters/controller/item.controller');
const { authenticate, authorize, tenantScope } = require('../config/middleware');

router.use(authenticate, tenantScope);

router.get( '/',              getAllItems);
router.post('/',    authorize('plant_head', 'it_admin'), createItem);
router.get( '/:id',           getItemById);
router.patch('/:id',          authorize('plant_head', 'it_admin'), updateItem);
router.delete('/:id',         authorize('plant_head', 'it_admin'), deleteItem);

module.exports = router;
