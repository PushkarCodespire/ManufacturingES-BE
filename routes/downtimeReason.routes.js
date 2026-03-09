const express = require('express');
const router  = express.Router();
const {
  getAllDowntimeReasons,
  getDowntimeReasonById,
  createDowntimeReason,
  updateDowntimeReason,
  deleteDowntimeReason,
} = require('../modules/masters/controller/downtimeReason.controller');
const { authenticate, authorize } = require('../config/middleware');

router.use(authenticate);

router.get( '/',     getAllDowntimeReasons);
router.get( '/:id',  getDowntimeReasonById);
router.post('/',     authorize('plant_head', 'it_admin'), createDowntimeReason);
router.patch('/:id', authorize('plant_head', 'it_admin'), updateDowntimeReason);
router.delete('/:id', authorize('plant_head', 'it_admin'), deleteDowntimeReason);

module.exports = router;
