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

// Read — any authenticated user (frontend gates with sites-shifts___leaves-read permission)
router.get( '/',     getAllShifts);
router.get( '/:id',  getShiftById);

// Write — admin only
router.post('/',     authorize('plant_head', 'it_admin'), createShift);
router.patch('/:id', authorize('plant_head', 'it_admin'), updateShift);
router.delete('/:id',authorize('plant_head', 'it_admin'), deleteShift);

module.exports = router;
