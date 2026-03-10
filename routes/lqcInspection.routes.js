const router = require('express').Router();
const { authenticate } = require('../config/middleware');
const ctrl = require('../modules/production/controller/lqcInspection.controller');
router.get('/',               authenticate, ctrl.getAll);
router.get('/:id',            authenticate, ctrl.getById);
router.post('/',              authenticate, ctrl.create);
router.patch('/:id/result',   authenticate, ctrl.updateResult);
router.delete('/:id',         authenticate, ctrl.delete);
module.exports = router;
