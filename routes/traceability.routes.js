const express = require('express');
const router  = express.Router();
const ctrl    = require('../modules/traceability/traceability.controller');
const { authenticate } = require('../config/middleware');

router.use(authenticate);

router.get('/search',                ctrl.search);
router.get('/lot/:lot_no',           ctrl.forwardTrace);
router.get('/grn/:grn_no',           ctrl.grnTrace);
router.get('/wo/:wo_no',             ctrl.woGenealogy);
router.get('/dispatch/:dispatch_no', ctrl.dispatchTrace);

module.exports = router;
