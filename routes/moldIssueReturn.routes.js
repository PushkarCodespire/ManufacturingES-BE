const express = require('express');
const router  = express.Router();
const {
  inspectReturn,
  verifyForIssue,
  issueMold,
  issueWithOverride,
  returnMold,
  getHistory,
} = require('../modules/mold/controller/moldIssueReturn.controller');
const { authenticate } = require('../config/middleware');

router.use(authenticate);

router.post('/inspect/:issueReturnId',            inspectReturn);
router.get( '/:moldId/verify/:woId/:machineId',   verifyForIssue);
router.post('/:moldId/issue',                      issueMold);
router.post('/:moldId/issue/override',             issueWithOverride);
router.post('/:moldId/return',                     returnMold);
router.get( '/:moldId/history',                    getHistory);

module.exports = router;
