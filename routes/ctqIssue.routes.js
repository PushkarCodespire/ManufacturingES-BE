const express = require('express');
const router  = express.Router();
const {
  getAllCtqIssues,
  getCtqIssueById,
  createCtqIssue,
  updateCtqIssue,
  deleteCtqIssue,
} = require('../modules/masters/controller/ctqIssue.controller');
const { authenticate, authorize } = require('../config/middleware');

router.use(authenticate);

router.get( '/',     getAllCtqIssues);
router.get( '/:id',  getCtqIssueById);
router.post('/',     authorize('plant_head', 'it_admin'), createCtqIssue);
router.patch('/:id', authorize('plant_head', 'it_admin'), updateCtqIssue);
router.delete('/:id', authorize('plant_head', 'it_admin'), deleteCtqIssue);

module.exports = router;
