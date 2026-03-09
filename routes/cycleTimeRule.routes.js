const express = require('express');
const router  = express.Router();
const {
  getAllRules,
  getRuleById,
  createRule,
  updateRule,
  deleteRule,
  setDailyTarget,
  bulkSaveRules,
} = require('../modules/masters/controller/cycleTimeRule.controller');
const { authenticate, authorize } = require('../config/middleware');

router.use(authenticate);

router.get( '/',                getAllRules);
router.get( '/:id',            getRuleById);
router.post('/',               authorize('plant_head', 'it_admin'), createRule);
router.post('/bulk',           authorize('plant_head', 'it_admin'), bulkSaveRules);
router.patch('/:id',           authorize('plant_head', 'it_admin'), updateRule);
router.delete('/:id',          authorize('plant_head', 'it_admin'), deleteRule);
router.post('/:id/daily-target', authorize('plant_head', 'it_admin'), setDailyTarget);

module.exports = router;
