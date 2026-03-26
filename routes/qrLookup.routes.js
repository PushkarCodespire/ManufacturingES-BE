const express = require('express');
const router  = express.Router();
const { qrLookup } = require('../modules/masters/controller/qrLookup.controller');
const { authenticate } = require('../config/middleware');

router.use(authenticate);
router.get('/', qrLookup);

module.exports = router;
