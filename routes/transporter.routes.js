const express = require('express');
const router  = express.Router();
const { getAllTransporters, createTransporter, updateTransporter, deleteTransporter } = require('../modules/masters/controller/transporter.controller');
const { authenticate, authorize } = require('../config/middleware');

router.use(authenticate);

router.get( '/',      getAllTransporters);
router.post('/',      authorize('dispatch_manager', 'it_admin', 'plant_head'), createTransporter);
router.patch('/:id',  authorize('dispatch_manager', 'it_admin', 'plant_head'), updateTransporter);
router.delete('/:id', authorize('dispatch_manager', 'it_admin', 'plant_head'), deleteTransporter);

module.exports = router;