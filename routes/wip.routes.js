const express = require('express');
const router  = express.Router();
const { checkIn, checkOut, getBoard, getHistory } = require('../modules/production/controller/wipMovement.controller');
const { authenticate } = require('../config/middleware');

router.use(authenticate);

router.get('/board',                getBoard);
router.get('/history/:workOrderId', getHistory);
router.post('/check-in',           checkIn);
router.post('/check-out',          checkOut);

module.exports = router;
