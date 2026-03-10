const express = require('express');
const router  = express.Router();
const { getAllTopics, createTopic, updateTopic, deleteTopic } = require('../modules/masters/controller/trainingTopic.controller');
const { authenticate, authorize } = require('../config/middleware');

router.use(authenticate);
router.use(authorize('hr_admin', 'it_admin', 'plant_head')); // hr_admin, it_admin, plant_head only

router.get( '/',     getAllTopics);
router.post('/',     createTopic);
router.patch('/:id', updateTopic);
router.delete('/:id',deleteTopic);

module.exports = router;
