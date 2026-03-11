const express = require('express');
const router  = express.Router();
const { getAllOrders, getOrderById, createOrder, updateOrder, deleteOrder, getDocumentsData } = require('../modules/masters/controller/dispatchOrder.controller');
const { authenticate, authorize } = require('../config/middleware');

router.use(authenticate);
router.use(authorize('dispatch_manager', 'it_admin', 'plant_head'));

router.get( '/',                    getAllOrders);
router.get( '/:id/documents-data',  getDocumentsData);
router.get( '/:id',                 getOrderById);
router.post('/',      createOrder);
router.patch('/:id',  updateOrder);
router.delete('/:id', deleteOrder);

module.exports = router;