const express = require('express');
const router  = express.Router();
const {
  getAllShifts,
  getShiftById,
  createShift,
  updateShift,
  deleteShift,
} = require('../modules/masters/controller/shift.controller');
const { authenticate, authorize } = require('../config/middleware');

router.use(authenticate);

router.get( '/',     authorize('plant_head', 'it_admin'), getAllShifts);
router.post('/',     authorize('plant_head', 'it_admin'), createShift);
router.get( '/:id',  authorize('plant_head', 'it_admin'), getShiftById);
router.patch('/:id', authorize('plant_head', 'it_admin'), updateShift);
router.delete('/:id',authorize('plant_head', 'it_admin'), deleteShift);

module.exports = router;
