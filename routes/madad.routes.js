const express = require('express');
const router  = express.Router();
const { authenticate } = require('../config/middleware');
const ctrl = require('../modules/ai/controller/madad.controller');

router.use(authenticate);

router.post('/chat',      ctrl.chat);
router.get('/history',   ctrl.getHistory);
router.get('/sessions',  ctrl.getSessions);

module.exports = router;
