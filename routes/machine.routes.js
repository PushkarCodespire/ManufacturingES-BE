const express = require('express');
const router  = express.Router();
const {
  getAllMachines,
  getMachineById,
  createMachine,
  bulkCreateMachines,
  updateMachine,
  updateMachineParameters,
  deleteMachine,
} = require('../modules/masters/controller/machine.controller');
const { authenticate, authorize, tenantScope } = require('../config/middleware');

router.use(authenticate, tenantScope);

router.get( '/',              getAllMachines);
router.post('/',    authorize('plant_head', 'it_admin'), createMachine);
router.post('/bulk', authorize('plant_head', 'it_admin'), bulkCreateMachines);
router.get( '/:id',           getMachineById);
router.patch('/:id',          authorize('plant_head', 'it_admin'), updateMachine);
router.patch('/:id/parameters', authorize('plant_head', 'it_admin'), updateMachineParameters);
router.delete('/:id',         authorize('plant_head', 'it_admin'), deleteMachine);

module.exports = router;
