const express = require('express');
const router  = express.Router();
const { authenticate } = require('../config/middleware');
const ctrl = require('../modules/mold/controller/moldDocuments.controller');

router.use(authenticate);

router.get('/report',                       ctrl.generateFleetReport);
router.get('/:moldId/history-card',         ctrl.getMoldHistoryCard);
router.get('/:moldId/status-certificate',   ctrl.getStatusCertificate);

module.exports = router;
