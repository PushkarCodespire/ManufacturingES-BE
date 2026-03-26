'use strict';

const router = require('express').Router();
const { authenticate } = require('../config/middleware');
const { globalSearch } = require('../modules/search/controller/search.controller');

router.use(authenticate);

// GET /api/search?q=<query>&limit=5
router.get('/', globalSearch);

module.exports = router;
