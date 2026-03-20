const express    = require('express');
const router     = express.Router();
const { authenticate, authorize } = require('../config/middleware');
const {
  getAssignments, getCalendar,
  createAssignment, updateAssignment, deleteAssignment,
  getCrew, addCrewMember, removeCrewMember,
} = require('../modules/production/controller/shiftAssignment.controller');

const PLAN_ROLES = ['plant_head', 'it_admin', 'production_manager', 'planning_manager', 'production_incharge'];

router.use(authenticate);

// ── Crew Roster — MUST be before /:id to avoid wildcard conflict ──────────────
router.get('/crew',        getCrew);
router.post('/crew',       authorize(...PLAN_ROLES), addCrewMember);
router.delete('/crew/:id', authorize(...PLAN_ROLES), removeCrewMember);

// ── Calendar — also before /:id ───────────────────────────────────────────────
router.get('/calendar',  getCalendar);

// ── Shift Assignments CRUD ────────────────────────────────────────────────────
router.get('/',          getAssignments);
router.post('/',         authorize(...PLAN_ROLES), createAssignment);
router.put('/:id',       authorize(...PLAN_ROLES), updateAssignment);
router.delete('/:id',    authorize(...PLAN_ROLES), deleteAssignment);

module.exports = router;
