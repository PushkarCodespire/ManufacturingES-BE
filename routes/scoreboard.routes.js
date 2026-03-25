const express = require('express');
const router  = express.Router();
const { authenticate } = require('../config/middleware');
const { getScoreboard } = require('../modules/production/controller/scoreboard.controller');

router.get('/', authenticate, getScoreboard);

module.exports = router;
