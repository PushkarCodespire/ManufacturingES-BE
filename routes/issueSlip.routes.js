const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/store/controller/issueSlip.controller');

const writeRoles = ['plant_head', 'it_admin', 'store_manager', 'store_incharge'];

router.use(authenticate);

router.get('/',       ctrl.getAll);
router.get('/:id',    ctrl.getById);
router.post('/',      authorize(...writeRoles), ctrl.create);
router.delete('/:id', authorize(...writeRoles), ctrl.delete);

module.exports = router;
