'use strict';
const router = require('express').Router();
const { authenticate, authorize } = require('../config/middleware');
const ctrl   = require('../modules/production/controller/operatorSkill.controller');

const WRITE_ROLES  = ['plant_head', 'it_admin', 'production_manager', 'hr_manager'];
const MANAGE_ROLES = ['plant_head', 'it_admin'];

router.use(authenticate);

// ── Matrix routes (must come before /:id) ─────────────────────────────────────
router.get('/matrix',                    ctrl.getMatrix);
router.post('/matrix',                   authorize(...WRITE_ROLES), ctrl.assignSkill);
router.put('/matrix/:id',                authorize(...WRITE_ROLES), ctrl.updateMatrix);
router.delete('/matrix/:id',             authorize(...WRITE_ROLES), ctrl.removeMatrix);
router.get('/matrix/by-operator/:userId', ctrl.getByOperator);

// ── Skill definition CRUD ──────────────────────────────────────────────────────
router.get('/',    ctrl.getAllSkills);
router.get('/:id', ctrl.getSkillById);
router.post('/',   authorize(...MANAGE_ROLES), ctrl.createSkill);
router.put('/:id', authorize(...MANAGE_ROLES), ctrl.updateSkill);
router.delete('/:id', authorize(...MANAGE_ROLES), ctrl.deleteSkill);

module.exports = router;
