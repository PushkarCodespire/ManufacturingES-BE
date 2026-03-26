const express = require('express');
const router = express.Router();
const {
  getConfigs, createConfig, updateConfig, deleteConfig, calculate, getChartData,
} = require('../modules/quality/controller/spcControlChart.controller');
const { authenticate } = require('../config/middleware');

router.use(authenticate);

router.get('/configs',              getConfigs);
router.post('/configs',             createConfig);
router.patch('/configs/:id',        updateConfig);
router.delete('/configs/:id',       deleteConfig);
router.post('/configs/:id/calculate', calculate);
router.get('/configs/:id/chart-data', getChartData);

module.exports = router;
