const express = require('express');
const router  = express.Router();
const {
  getAllTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
} = require('../modules/masters/controller/tag.controller');
const { authenticate, authorize } = require('../config/middleware');

router.use(authenticate);

router.get( '/',     getAllTags);
router.post('/',     authorize('plant_head', 'it_admin'), createTag);
router.get( '/:id',  getTagById);
router.patch('/:id', authorize('plant_head', 'it_admin'), updateTag);
router.delete('/:id', authorize('plant_head', 'it_admin'), deleteTag);

module.exports = router;
