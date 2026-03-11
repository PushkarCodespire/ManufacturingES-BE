const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/npd/controller/checkSheet.controller');

const npdRoles = ['plant_head', 'it_admin', 'quality_manager', 'quality_incharge'];

router.use(authenticate);

router.get('/',                      ctrl.getAll);
router.get('/:id',                   ctrl.getById);
router.post('/',                     authorize(...npdRoles), ctrl.create);
router.patch('/:id',                 authorize(...npdRoles), ctrl.update);
router.put('/:id/dimensions',        authorize(...npdRoles), ctrl.updateDimensions);
router.delete('/:id',                authorize(...npdRoles), ctrl.delete);

module.exports = router;
