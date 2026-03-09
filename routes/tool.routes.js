const express = require('express');
const router  = express.Router();
const {
  getAllTools,
  getToolById,
  createTool,
  updateTool,
  deleteTool,
} = require('../modules/masters/controller/tool.controller');
const { authenticate, authorize } = require('../config/middleware');

router.use(authenticate);

router.get( '/',     getAllTools);
router.get( '/:id',  getToolById);
router.post('/',     authorize('plant_head', 'it_admin'), createTool);
router.patch('/:id', authorize('plant_head', 'it_admin'), updateTool);
router.delete('/:id', authorize('plant_head', 'it_admin'), deleteTool);

module.exports = router;
