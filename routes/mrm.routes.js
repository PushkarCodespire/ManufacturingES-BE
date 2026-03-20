const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl = require('../modules/mrm/controller/mrm.controller');

const MGT_ROLES   = ['plant_head', 'it_admin', 'quality_manager'];
const MRM_ALLOWED = ['plant_head', 'it_admin', 'quality_manager', 'quality_incharge'];

router.use(authenticate);

router.get('/compile/:quarter',             ctrl.compile);
router.get('/actions',                      ctrl.getAllActions);
router.patch('/actions/:actionId',          authorize(...MRM_ALLOWED), ctrl.updateAction);
router.get('/meetings',                     ctrl.getAll);
router.get('/meetings/:id',                 ctrl.getById);
router.post('/meetings',                    authorize(...MGT_ROLES), ctrl.create);
router.patch('/meetings/:id/start',         authorize(...MRM_ALLOWED), ctrl.startMeeting);
router.patch('/meetings/:id/draft-minutes', authorize(...MRM_ALLOWED), ctrl.draftMinutes);
router.patch('/meetings/:id/sign',          authorize(...MGT_ROLES), ctrl.sign);
router.post('/meetings/:id/capture',        authorize(...MRM_ALLOWED), ctrl.captureMinute);
router.post('/meetings/:id/actions',        authorize(...MRM_ALLOWED), ctrl.addAction);

module.exports = router;
