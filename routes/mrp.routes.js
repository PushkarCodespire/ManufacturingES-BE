const router = require('express').Router();
const { authenticate, authorize } = require('../config/middleware');
const { runMrp, generatePr } = require('../modules/production/controller/mrp.controller');

const PLAN_ROLES = ['plant_head', 'it_admin', 'production_manager', 'production_incharge', 'planning_manager', 'planning_incharge'];

router.use(authenticate);

router.get('/run',         runMrp);
router.post('/generate-pr', authorize(...PLAN_ROLES), generatePr);

module.exports = router;
