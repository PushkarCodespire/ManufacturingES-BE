const express = require('express');
const router  = express.Router();
const {
  getAll,
  getById,
  create,
  update,
  deleteGroup,
} = require('../modules/masters/controller/customFieldGroup.controller');
const { authenticate, authorize } = require('../config/middleware');

router.use(authenticate);

router.get( '/',    getAll);
router.get( '/:id', getById);
router.post('/',    authorize('plant_head', 'it_admin'), create);
router.patch('/:id', authorize('plant_head', 'it_admin'), update);
router.delete('/:id', authorize('plant_head', 'it_admin'), deleteGroup);

module.exports = router;
