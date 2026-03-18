const express = require('express');
const router  = express.Router();
const {
  inspectReturn,
  verifyForIssue,
  issueMold,
  issueWithOverride,
  returnMold,
  getHistory,
  aiPhotoAnalyze,
} = require('../modules/mold/controller/moldIssueReturn.controller');
const { authenticate } = require('../config/middleware');
const { visionUpload } = require('../config/upload');

router.use(authenticate);

// Static routes FIRST — before parametric /:moldId routes to avoid collision
router.post('/ai-photo-analyze', visionUpload.single('file'), aiPhotoAnalyze);

router.post('/inspect/:issueReturnId',           inspectReturn);
router.get( '/:moldId/verify/:woId/:machineId',  verifyForIssue);
router.post('/:moldId/issue',                     issueMold);
router.post('/:moldId/issue/override',            issueWithOverride);
router.post('/:moldId/return',                    returnMold);
router.get( '/:moldId/history',                   getHistory);

module.exports = router;
