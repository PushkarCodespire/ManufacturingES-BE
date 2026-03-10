const express = require('express');
const router  = express.Router();
const { authenticate } = require('../config/middleware');
const ctrl = require('../modules/store/controller/inventory.controller');

router.use(authenticate);

router.get('/stock',  ctrl.getStock);
router.get('/ledger', ctrl.getLedger);

module.exports = router;
