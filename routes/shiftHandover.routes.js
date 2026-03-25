const express = require('express');
const router  = express.Router();
const { authenticate } = require('../config/middleware');
const {
  getAll,
  getById,
  create,
  update,
  submit,
  acknowledge,
  updateItem,
  addItem,
} = require('../modules/production/controller/shiftHandover.controller');

router.get('/',    authenticate, getAll);
router.post('/',   authenticate, create);
router.get('/:id', authenticate, getById);
router.patch('/:id',             authenticate, update);
router.patch('/:id/submit',      authenticate, submit);
router.patch('/:id/acknowledge', authenticate, acknowledge);
router.post('/:id/items',        authenticate, addItem);
router.patch('/:id/items/:itemId', authenticate, updateItem);

module.exports = router;
