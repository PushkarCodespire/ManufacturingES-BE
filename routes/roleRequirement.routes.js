const express = require('express');
const router  = express.Router();
const { getAllRequirements, getByRole, bulkSaveForRole, deleteRequirement } = require('../modules/masters/controller/roleRequirement.controller');
const { authenticate, authorize } = require('../config/middleware');

router.use(authenticate);
router.use(authorize('hr_admin', 'it_admin', 'plant_head')); // hr_admin, it_admin, plant_head only

router.get( '/',              getAllRequirements);
router.get( '/role/:roleId',  getByRole);
router.post('/bulk',          bulkSaveForRole);
router.delete('/:id',         deleteRequirement);

module.exports = router;
