const express = require('express');
const router  = express.Router();
const { getAllChallans, createChallan, updateChallan, deleteChallan } = require('../modules/masters/controller/deliveryChallan.controller');
const { authenticate, authorize } = require('../config/middleware');

router.use(authenticate);
router.use(authorize('dispatch_manager', 'it_admin', 'plant_head'));

router.get( '/',      getAllChallans);
router.post('/',      createChallan);
router.patch('/:id',  updateChallan);
router.delete('/:id', deleteChallan);

module.exports = router;