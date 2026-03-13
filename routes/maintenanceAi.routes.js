'use strict';
const router = require('express').Router();
const ctrl   = require('../modules/maintenance/controller/maintenanceAi.controller');
const { authenticate } = require('../config/middleware');

router.use(authenticate);

// MNT-001: AI criticality suggestion for a single equipment
router.get('/criticality-suggestion/:id', ctrl.getCriticalitySuggestion);

// MNT-010: Spare part consumption anomaly detection
router.get('/spare-part-anomalies',        ctrl.getSparePartAnomalies);

// MNT-011: LOTO procedure auto-load  (?equipment_id=xxx)
router.get('/loto-suggestion',             ctrl.getLotoSuggestion);

// ── Wave 2: Pattern Detection ─────────────────────────────────────────────────
// MNT-007: Root cause suggestion for a breakdown (?save=true to persist to BD record)
// MNT-014: Enhanced with 5-Why pre-fill when ≥5 historical WOs exist (Wave 3)
router.get('/root-cause/:breakdownId',     ctrl.getRootCauseSuggestion);

// MNT-003: Failure pattern detection (?equipment_id=xxx to filter)
router.get('/failure-patterns',            ctrl.getFailurePatterns);

// MNT-005: PM schedule interval optimization recommendations
router.get('/pm-optimization',             ctrl.getPmOptimization);

// MNT-008: Downtime pattern analysis by hour/day/equipment (?days=90)
router.get('/downtime-patterns',           ctrl.getDowntimePatterns);

// ── Wave 3: Multi-factor Optimization ────────────────────────────────────────
// MNT-004: Smart technician suggestion (?equipment_id=xxx&template_id=xxx)
router.get('/technician-suggestion',       ctrl.getTechnicianSuggestion);

// MNT-009: Spare parts demand forecast for equipment BOM (?equipment_id=xxx)
router.get('/spare-demand-forecast',       ctrl.getSpareDemandForecast);

// MNT-015: Smart PM scheduling optimizer (all open WOs ranked)
router.get('/smart-schedule',              ctrl.getSmartSchedule);

module.exports = router;
