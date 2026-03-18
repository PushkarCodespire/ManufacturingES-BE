const express = require('express');
const router  = express.Router();
const { getAllRecords, createRecord, updateRecord, deleteRecord, getCompetencyMatrix, getAiSkillGap } = require('../modules/masters/controller/trainingRecord.controller');
const { authenticate, authorize } = require('../config/middleware');

router.use(authenticate);
router.use(authorize('hr_admin', 'it_admin', 'plant_head')); // hr_admin, it_admin, plant_head only

router.get( '/matrix',        getCompetencyMatrix);   // must be before /:id
router.get( '/ai-skill-gap',  getAiSkillGap);         // AI: training skill gap analysis
router.get( '/',              getAllRecords);
router.post('/',       createRecord);
router.patch('/:id',   updateRecord);
router.delete('/:id',  deleteRecord);

module.exports = router;
