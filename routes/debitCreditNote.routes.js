const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/accounts/controller/debitCreditNote.controller');

const writeRoles = ['plant_head', 'it_admin', 'accounts_manager', 'accounts_incharge'];

router.use(authenticate);

router.get('/',              ctrl.getAll);
router.get('/:id',           ctrl.getById);
router.post('/',             authorize(...writeRoles), ctrl.create);
router.patch('/:id',         authorize(...writeRoles), ctrl.update);
router.patch('/:id/approve', authorize(...writeRoles), ctrl.approve);
router.delete('/:id',        authorize(...writeRoles), ctrl.delete);

module.exports = router;
