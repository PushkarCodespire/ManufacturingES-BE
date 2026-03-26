const express = require('express');
const router = express.Router();
const { getGantt, autoSchedule, reschedule, getOverloads } = require('../modules/production/controller/capacityScheduler.controller');
const { authenticate, authorize } = require('../config/middleware');

router.use(authenticate);

router.get('/gantt',            getGantt);
router.get('/overloads',        getOverloads);
router.post('/auto-schedule',   authorize('plant_head', 'it_admin', 'production_manager', 'planning_manager'), autoSchedule);
router.patch('/reschedule/:id', authorize('plant_head', 'it_admin', 'production_manager', 'planning_manager'), reschedule);

module.exports = router;
