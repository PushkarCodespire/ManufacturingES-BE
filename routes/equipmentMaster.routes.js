'use strict';
const router = require('express').Router();
const ctrl   = require('../modules/maintenance/controller/equipmentMaster.controller');
const cred   = require('../modules/maintenance/cred/equipmentMaster.cred');
const { authenticate } = require('../config/middleware');

router.use(authenticate);

// Categories & Masters
router.get('/categories',          ctrl.getCategories);
router.post('/categories',         cred.createCategory, ctrl.createCategory);
router.get('/failure-codes',       ctrl.getFailureCodes);
router.post('/failure-codes',      cred.createFailureCode, ctrl.createFailureCode);
router.get('/priorities',          ctrl.getPriorities);

// Equipment Hierarchy
router.get('/hierarchy',           ctrl.getHierarchy);

// Equipment CRUD
router.get('/',                    ctrl.getAll);
router.post('/',                   cred.createEquipment, ctrl.create);
router.get('/:id',                 ctrl.getById);
router.patch('/:id',               cred.updateEquipment, ctrl.update);
router.delete('/:id',              ctrl.delete);
router.post('/:id/documents',      ctrl.addDocument);

module.exports = router;
