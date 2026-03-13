'use strict';
/**
 * Maintenance AI Controller — Wave 1 + Wave 2 + Wave 3
 *
 * Wave 1 (rule-based, 100% local):
 *   MNT-001  getCriticalitySuggestion  — A/B/C based on breakdown frequency + downtime
 *   MNT-010  getSparePartAnomalies     — flag parts where last-30d > 2× 5-month avg
 *   MNT-011  getLotoSuggestion         — auto-load LOTO procedure for an equipment
 *
 * Wave 2 (pattern detection, 100% local):
 *   MNT-007  getRootCauseSuggestion    — keyword-match symptoms → FailureCodes + history
 *   MNT-003  getFailurePatterns        — detect recurring/periodic failure patterns
 *   MNT-005  getPmOptimization         — recommend PM interval changes based on breakdown rate
 *   MNT-008  getDowntimePatterns       — group unplanned downtime by hour/day/equipment
 *
 * Wave 3 (multi-factor optimization, 100% local):
 *   MNT-014  getRootCauseSuggestion    — enhanced with 5-Why pre-fill (≥5 historical WOs)
 *   MNT-004  getTechnicianSuggestion   — rank technicians by experience + availability + speed
 *   MNT-009  getSpareDemandForecast    — 3-month demand forecast per equipment BOM
 *   MNT-015  getSmartSchedule          — multi-constraint PM scheduling optimizer
 */
const { Op } = require('sequelize');
const db      = require('../../../models');

const {
  Equipment,
  EquipmentCategory,
  BreakdownRequest,
  DowntimeLog,
  SparePartConsumption,
  SparePart,
  SparePartBom,
  LotoProcedure,
  MaintenanceWorkOrder,
  FailureCode,
  PmSchedule,
  PmTemplate,
  PmWorkOrder,
  ProductionSchedule,
  User,
} = db;

// ── MNT-001: Criticality Suggestion ──────────────────────────────────────────
exports.getCriticalitySuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    const equip = await Equipment.findByPk(id, {
      include: [{ model: EquipmentCategory, as: 'Category' }],
    });
    if (!equip) return res.status(404).json({ success: false, message: 'Equipment not found' });

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Breakdown frequency in last 90 days
    const bdCount = await BreakdownRequest.count({
      where: { equipment_id: id, createdAt: { [Op.gte]: ninetyDaysAgo } },
    });

    // Unplanned downtime hours in last 90 days
    const downtimeLogs = await DowntimeLog.findAll({
      where: {
        equipment_id:  id,
        downtime_type: 'unplanned',
        start_time:    { [Op.gte]: ninetyDaysAgo },
      },
      attributes: ['duration_minutes'],
    });
    const downtimeHours =
      downtimeLogs.reduce((s, l) => s + (l.duration_minutes || 0), 0) / 60;

    // Backup equipment count (same category, different equipment)
    const backupCount = equip.category_id
      ? await Equipment.count({
          where: { id: { [Op.ne]: id }, category_id: equip.category_id, is_active: true },
        })
      : 0;

    // Scoring logic
    let suggested = 'C';
    const reasons = [];

    if (bdCount > 5 || downtimeHours > 48) {
      suggested = 'A';
      if (bdCount > 5)       reasons.push(`${bdCount} breakdowns in last 90 days`);
      if (downtimeHours > 48) reasons.push(`${downtimeHours.toFixed(1)} hrs unplanned downtime`);
    } else if (bdCount > 2 || downtimeHours > 12) {
      suggested = 'B';
      if (bdCount > 2)       reasons.push(`${bdCount} breakdowns in last 90 days`);
      if (downtimeHours > 12) reasons.push(`${downtimeHours.toFixed(1)} hrs unplanned downtime`);
    } else {
      reasons.push('Low breakdown frequency and downtime in last 90 days');
    }

    // No backup → upgrade one level
    if (backupCount === 0) {
      reasons.push('No backup equipment in same category');
      if (suggested === 'C') suggested = 'B';
    } else {
      reasons.push(`${backupCount} backup equipment available in same category`);
    }

    return res.json({
      success: true,
      data: {
        suggested_criticality: suggested,
        current_criticality:   equip.criticality,
        breakdown_count_90d:   bdCount,
        downtime_hours_90d:    parseFloat(downtimeHours.toFixed(1)),
        backup_count:          backupCount,
        reasons,
      },
    });
  } catch (err) {
    console.error('[maintenanceAi] getCriticalitySuggestion:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to calculate criticality suggestion' });
  }
};

// ── MNT-010: Spare Part Consumption Anomalies ─────────────────────────────────
exports.getSparePartAnomalies = async (req, res) => {
  try {
    const now            = new Date();
    const thirtyDaysAgo  = new Date(now - 30  * 24 * 60 * 60 * 1000);
    const sixMonthsAgo   = new Date(now - 180 * 24 * 60 * 60 * 1000);

    // Pull all consumption for last 6 months (raw for speed)
    const allRows = await SparePartConsumption.findAll({
      where:      { consumed_at: { [Op.gte]: sixMonthsAgo } },
      attributes: ['spare_part_id', 'quantity_consumed', 'consumed_at'],
      raw:        true,
    });

    // Group: recent (last 30d) vs history (31-180d)
    const byPart = {};
    for (const row of allRows) {
      const pid = row.spare_part_id;
      if (!byPart[pid]) byPart[pid] = { recent: 0, historyTotal: 0 };
      const qty         = parseFloat(row.quantity_consumed) || 0;
      const consumedAt  = new Date(row.consumed_at);
      if (consumedAt >= thirtyDaysAgo) {
        byPart[pid].recent += qty;
      } else {
        byPart[pid].historyTotal += qty;
      }
    }

    // Flag anomalies: recent > 2× monthly avg of prior 5 months
    const anomalous = [];
    for (const [partId, data] of Object.entries(byPart)) {
      if (data.recent === 0) continue;
      const monthlyAvg = data.historyTotal / 5; // 5-month window
      if (monthlyAvg > 0 && data.recent > 2 * monthlyAvg) {
        anomalous.push({
          spare_part_id: parseInt(partId, 10),
          recent_30d:    parseFloat(data.recent.toFixed(3)),
          monthly_avg:   parseFloat(monthlyAvg.toFixed(3)),
          ratio:         parseFloat((data.recent / monthlyAvg).toFixed(2)),
        });
      }
    }

    // Enrich with spare part details
    if (anomalous.length > 0) {
      const ids  = anomalous.map((p) => p.spare_part_id);
      const parts = await SparePart.findAll({
        where:      { id: ids },
        attributes: ['id', 'part_code', 'name', 'unit_of_measure', 'current_stock', 'min_stock'],
      });
      const map = {};
      parts.forEach((p) => { map[p.id] = p; });
      anomalous.forEach((a) => {
        const sp = map[a.spare_part_id];
        if (sp) {
          a.part_code       = sp.part_code;
          a.name            = sp.name;
          a.unit_of_measure = sp.unit_of_measure;
          a.current_stock   = parseFloat(sp.current_stock);
          a.min_stock       = parseFloat(sp.min_stock);
        }
      });
    }

    // Sort by highest ratio first
    anomalous.sort((a, b) => b.ratio - a.ratio);

    return res.json({ success: true, data: anomalous });
  } catch (err) {
    console.error('[maintenanceAi] getSparePartAnomalies:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to analyze spare part anomalies' });
  }
};

// ── MNT-011: LOTO Procedure Auto-Suggestion ───────────────────────────────────
exports.getLotoSuggestion = async (req, res) => {
  try {
    const { equipment_id } = req.query;
    if (!equipment_id) {
      return res.status(400).json({ success: false, message: 'equipment_id query param is required' });
    }

    const procedures = await LotoProcedure.findAll({
      where: { equipment_id: parseInt(equipment_id, 10), is_active: true },
      order: [['id', 'ASC']],
    });

    return res.json({
      success:   true,
      data:      procedures,
      suggested: procedures[0] || null, // best match = first defined procedure
    });
  } catch (err) {
    console.error('[maintenanceAi] getLotoSuggestion:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch LOTO suggestion' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// WAVE 2 — Pattern Detection
// ══════════════════════════════════════════════════════════════════════════════

// ── MNT-007: Root Cause Suggestion ───────────────────────────────────────────
exports.getRootCauseSuggestion = async (req, res) => {
  try {
    const { breakdownId } = req.params;
    const save = req.query.save === 'true';

    const bd = await BreakdownRequest.findByPk(breakdownId);
    if (!bd) return res.status(404).json({ success: false, message: 'Breakdown not found' });

    const tokens = (bd.symptoms || '')
      .toLowerCase()
      .split(/[\s,.\-\/]+/)
      .filter((t) => t.length >= 3);

    // Get equipment category for focused failure code lookup
    const equip = await Equipment.findByPk(bd.equipment_id, { attributes: ['id', 'category_id'] });

    // Load failure codes (prefer same category, fallback all)
    const whereFC = { is_active: true };
    if (equip?.category_id) {
      whereFC[Op.or] = [
        { equipment_category_id: equip.category_id },
        { equipment_category_id: null },
      ];
    }
    const failureCodes = await FailureCode.findAll({ where: whereFC });

    // Score by keyword overlap
    const scored = failureCodes.map((fc) => {
      const haystack = `${fc.name} ${fc.typical_cause || ''} ${fc.description || ''}`.toLowerCase();
      const matched  = tokens.filter((t) => haystack.includes(t)).length;
      return { fc, score: tokens.length > 0 ? matched / tokens.length : 0, matched };
    });

    // Boost by historical frequency (same equipment, completed WOs)
    const pastWOs = await MaintenanceWorkOrder.findAll({
      where:      { equipment_id: bd.equipment_id, status: 'completed', failure_code_id: { [Op.ne]: null } },
      attributes: ['failure_code_id'],
      raw:        true,
    });
    const freq = {};
    pastWOs.forEach((w) => { freq[w.failure_code_id] = (freq[w.failure_code_id] || 0) + 1; });
    const maxFreq = Math.max(1, ...Object.values(freq));

    scored.forEach((s) => {
      const histBoost = ((freq[s.fc.id] || 0) / maxFreq) * 0.3;
      s.combined     = parseFloat((s.score * 0.7 + histBoost).toFixed(3));
      s.histCount    = freq[s.fc.id] || 0;
    });

    const suggestions = scored
      .filter((s) => s.combined > 0 || s.histCount > 0)
      .sort((a, b) => b.combined - a.combined)
      .slice(0, 3)
      .map((s) => ({
        failure_code_id: s.fc.id,
        code:            s.fc.code,
        name:            s.fc.name,
        category:        s.fc.category,
        typical_cause:   s.fc.typical_cause,
        confidence:      Math.min(100, Math.round(s.combined * 100)),
        history_count:   s.histCount,
      }));

    // Auto-save top suggestion to breakdown if requested
    if (save && suggestions.length > 0) {
      const top = suggestions[0];
      await BreakdownRequest.update({
        ai_suggested_cause:           `${top.name}: ${top.typical_cause || '—'}`,
        ai_suggested_failure_code_id: top.failure_code_id,
        updated_by:                   req.user?.id,
      }, { where: { id: breakdownId } });
    }

    // ── Wave 3 (MNT-014): 5-Why template when ≥5 historical WOs exist ───────────
    let five_why_template = null;
    if (pastWOs.length >= 5 && suggestions.length > 0) {
      const top = suggestions[0];
      const sixMonthsAgo = new Date(Date.now() - 180 * 864e5);
      const [pmCompleted, pmExpected] = await Promise.all([
        PmWorkOrder.count({ where: { equipment_id: bd.equipment_id, status: 'completed', completed_at: { [Op.gte]: sixMonthsAgo } } }),
        PmWorkOrder.count({ where: { equipment_id: bd.equipment_id, planned_date: { [Op.gte]: sixMonthsAgo.toISOString().slice(0, 10) } } }),
      ]);
      const pmCompliance = pmExpected > 0 ? Math.round((pmCompleted / pmExpected) * 100) : null;

      five_why_template = [
        { level: 1, question: 'Why did the failure occur?',         answer: bd.symptoms || `${top.name} failure detected` },
        { level: 2, question: 'Why did that failure mode arise?',   answer: top.typical_cause || top.name },
        { level: 3, question: 'Why was it not detected/prevented?', answer: `${pastWOs.length} similar failure(s) recorded on this equipment` + (top.history_count > 0 ? `; ${top.history_count} matching this failure code` : '') },
        { level: 4, question: 'Why did the prevention system fail?', answer: pmCompliance !== null ? `PM compliance was ${pmCompliance}% in last 6 months — review schedule frequency` : 'No PM history found for this equipment — schedule preventive maintenance' },
        { level: 5, question: 'What is the root systemic cause?',   answer: `Recommend: ${pmCompliance !== null && pmCompliance < 70 ? 'tighten PM schedule' : 'proactive component replacement'} and operator training on early detection of ${top.category || top.name} issues` },
      ];
    }

    return res.json({
      success: true,
      data: {
        breakdown_id:       parseInt(breakdownId, 10),
        symptoms:           bd.symptoms,
        suggestions,
        historical_wo_count: pastWOs.length,
        five_why_template,
        saved: save && suggestions.length > 0,
      },
    });
  } catch (err) {
    console.error('[maintenanceAi] getRootCauseSuggestion:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to suggest root cause' });
  }
};

// ── MNT-003: Failure Pattern Detection ───────────────────────────────────────
exports.getFailurePatterns = async (req, res) => {
  try {
    const { equipment_id } = req.query;
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const where = {
      status:          'completed',
      failure_code_id: { [Op.ne]: null },
      createdAt:       { [Op.gte]: ninetyDaysAgo },
    };
    if (equipment_id) where.equipment_id = parseInt(equipment_id, 10);

    const wos = await MaintenanceWorkOrder.findAll({ where, attributes: ['id', 'equipment_id', 'failure_code_id', 'createdAt'], raw: true });

    // Collect unique equipment + failure code IDs
    const equipIds = [...new Set(wos.map((w) => w.equipment_id))];
    const fcIds    = [...new Set(wos.map((w) => w.failure_code_id))];

    const equipList = await Equipment.findAll({ where: { id: equipIds }, attributes: ['id', 'equipment_code', 'name', 'criticality'], raw: true });
    const fcList    = await FailureCode.findAll({ where: { id: fcIds }, attributes: ['id', 'code', 'name', 'category', 'typical_cause'], raw: true });

    const equipMap = {};  equipList.forEach((e) => { equipMap[e.id] = e; });
    const fcMap    = {};  fcList.forEach((f) => { fcMap[f.id] = f; });

    // Group by equipment + failure_code
    const groups = {};
    wos.forEach((wo) => {
      const key = `${wo.equipment_id}::${wo.failure_code_id}`;
      if (!groups[key]) groups[key] = { eqId: wo.equipment_id, fcId: wo.failure_code_id, dates: [] };
      groups[key].dates.push(new Date(wo.createdAt));
    });

    const patterns = [];
    for (const g of Object.values(groups)) {
      const count = g.dates.length;
      if (count < 2) continue;

      const sorted = g.dates.sort((a, b) => a - b);
      const intervals = [];
      for (let i = 1; i < sorted.length; i++) {
        intervals.push((sorted[i] - sorted[i - 1]) / 864e5); // days
      }
      const avgInterval = intervals.reduce((s, v) => s + v, 0) / intervals.length;
      const stddev = Math.sqrt(intervals.reduce((s, v) => s + Math.pow(v - avgInterval, 2), 0) / intervals.length);
      const isPeriodic = avgInterval > 0 && stddev / avgInterval < 0.3;

      const eq = equipMap[g.eqId] || {};
      const fc = fcMap[g.fcId] || {};
      const severity = count >= 5 ? 'high' : count >= 3 ? 'medium' : 'low';

      patterns.push({
        equipment_id:         g.eqId,
        equipment_code:       eq.equipment_code,
        equipment_name:       eq.name,
        equipment_criticality:eq.criticality,
        failure_code_id:      g.fcId,
        failure_code:         fc.code,
        failure_name:         fc.name,
        failure_category:     fc.category,
        typical_cause:        fc.typical_cause,
        occurrences_90d:      count,
        severity,
        avg_interval_days:    parseFloat(avgInterval.toFixed(1)),
        is_periodic:          isPeriodic,
        last_occurrence:      sorted[sorted.length - 1],
        recommendation:       isPeriodic
          ? `Schedule PM every ${Math.max(1, Math.round(avgInterval * 0.8))} days to prevent recurrence`
          : `Investigate root cause — ${count} occurrences in 90 days`,
      });
    }

    const sevOrder = { high: 3, medium: 2, low: 1 };
    patterns.sort((a, b) => (sevOrder[b.severity] - sevOrder[a.severity]) || b.occurrences_90d - a.occurrences_90d);

    return res.json({ success: true, data: patterns });
  } catch (err) {
    console.error('[maintenanceAi] getFailurePatterns:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to detect failure patterns' });
  }
};

// ── MNT-005: PM Schedule Optimization ────────────────────────────────────────
exports.getPmOptimization = async (req, res) => {
  try {
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const FREQ_DAYS    = { daily: 1, weekly: 7, monthly: 30, quarterly: 91, semi_annual: 182, annual: 365 };

    const schedules = await PmSchedule.findAll({ where: { status: 'active' }, raw: true });

    // Enrich each schedule individually to avoid association issues
    const recommendations = [];
    for (const sched of schedules) {
      const equip    = sched.equipment_id ? await Equipment.findByPk(sched.equipment_id, { attributes: ['id', 'equipment_code', 'name', 'criticality'], raw: true }) : null;
      const template = sched.template_id  ? await PmTemplate.findByPk(sched.template_id,  { attributes: ['id', 'name', 'frequency_type', 'frequency_days'],  raw: true }) : null;
      if (!equip || !template) continue;

      const intervalDays = template.frequency_days || FREQ_DAYS[template.frequency_type] || 30;

      const [completedPMs, missedPMs, breakdowns] = await Promise.all([
        PmWorkOrder.count({ where: { schedule_id: sched.id, status: 'completed', completed_at: { [Op.gte]: sixMonthsAgo } } }),
        PmWorkOrder.count({ where: { schedule_id: sched.id, status: { [Op.in]: ['skipped', 'cancelled'] }, planned_date: { [Op.gte]: sixMonthsAgo } } }),
        BreakdownRequest.count({ where: { equipment_id: sched.equipment_id, createdAt: { [Op.gte]: sixMonthsAgo } } }),
      ]);

      const expectedCycles = Math.max(1, Math.floor(180 / intervalDays));
      const pmCompliance   = Math.min(100, Math.round((completedPMs / expectedCycles) * 100));

      let action = 'maintain';
      let reason = `${pmCompliance}% PM compliance, ${breakdowns} breakdown(s) in 6 months — interval looks appropriate`;
      let suggested_days = intervalDays;

      if (missedPMs > expectedCycles * 0.3) {
        action = 'scheduling_issue';
        reason = `${missedPMs} PM(s) skipped or cancelled — review scheduling or resources`;
      } else if (breakdowns > expectedCycles) {
        action          = 'tighten';
        suggested_days  = Math.max(1, Math.round(intervalDays * 0.8));
        reason          = `${breakdowns} breakdowns in 6 months exceeds expected PM cycles — more frequent PM recommended`;
      } else if (breakdowns === 0 && pmCompliance >= 80) {
        action          = 'extend';
        suggested_days  = Math.round(intervalDays * 1.25);
        reason          = 'Zero breakdowns with good PM compliance — interval can likely be extended safely';
      }

      recommendations.push({
        schedule_id:            sched.id,
        equipment_id:           sched.equipment_id,
        equipment_code:         equip.equipment_code,
        equipment_name:         equip.name,
        equipment_criticality:  equip.criticality,
        template_name:          template.name,
        current_frequency_type: template.frequency_type,
        current_interval_days:  intervalDays,
        suggested_interval_days:suggested_days,
        breakdowns_6m:          breakdowns,
        pm_compliance_pct:      pmCompliance,
        missed_pms_6m:          missedPMs,
        action,
        reason,
        next_due_date:          sched.next_due_date,
      });
    }

    const priority = { scheduling_issue: 4, tighten: 3, extend: 2, maintain: 1 };
    recommendations.sort((a, b) => (priority[b.action] || 0) - (priority[a.action] || 0));

    return res.json({ success: true, data: recommendations });
  } catch (err) {
    console.error('[maintenanceAi] getPmOptimization:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to calculate PM optimization' });
  }
};

// ── MNT-008: Downtime Pattern Analysis ───────────────────────────────────────
exports.getDowntimePatterns = async (req, res) => {
  try {
    const days  = Math.min(365, parseInt(req.query.days || '90', 10));
    const since = new Date(Date.now() - days * 864e5);
    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const logs = await DowntimeLog.findAll({
      where:      { start_time: { [Op.gte]: since }, downtime_type: 'unplanned' },
      attributes: ['equipment_id', 'start_time', 'duration_minutes'],
      raw:        true,
    });

    const byHour      = Array(24).fill(0).map((_, h) => ({ hour: h, label: `${String(h).padStart(2,'0')}:00`, minutes: 0, events: 0 }));
    const byDay       = Array(7).fill(0).map((_, d) => ({ day: d, day_name: DAY_NAMES[d], minutes: 0, events: 0 }));
    const byEquipment = {};

    for (const log of logs) {
      const dur = log.duration_minutes || 0;
      if (log.start_time) {
        const d = new Date(log.start_time);
        byHour[d.getHours()].minutes += dur;
        byHour[d.getHours()].events  += 1;
        byDay[d.getDay()].minutes    += dur;
        byDay[d.getDay()].events     += 1;
      }
      if (log.equipment_id) {
        if (!byEquipment[log.equipment_id]) byEquipment[log.equipment_id] = { total_minutes: 0, event_count: 0 };
        byEquipment[log.equipment_id].total_minutes += dur;
        byEquipment[log.equipment_id].event_count++;
      }
    }

    // Enrich top equipment with names
    const topRaw = Object.entries(byEquipment)
      .map(([id, d]) => ({ equipment_id: parseInt(id, 10), ...d }))
      .sort((a, b) => b.total_minutes - a.total_minutes)
      .slice(0, 5);

    const equipList = await Equipment.findAll({ where: { id: topRaw.map((r) => r.equipment_id) }, attributes: ['id', 'equipment_code', 'name', 'criticality'], raw: true });
    const equipMap  = {};
    equipList.forEach((e) => { equipMap[e.id] = e; });
    const topEquipment = topRaw.map((r) => ({
      ...r,
      equipment_code:  equipMap[r.equipment_id]?.equipment_code,
      equipment_name:  equipMap[r.equipment_id]?.name,
      criticality:     equipMap[r.equipment_id]?.criticality,
    }));

    const worstDay  = [...byDay].sort((a, b) => b.minutes - a.minutes)[0];
    const peakHours = [...byHour].sort((a, b) => b.minutes - a.minutes).slice(0, 3).map((h) => h.hour);

    return res.json({
      success: true,
      data: {
        period_days:             days,
        total_events:            logs.length,
        total_unplanned_minutes: logs.reduce((s, l) => s + (l.duration_minutes || 0), 0),
        by_hour:                 byHour,
        by_day:                  byDay,
        peak_hours:              peakHours,
        worst_day:               worstDay,
        top_equipment:           topEquipment,
      },
    });
  } catch (err) {
    console.error('[maintenanceAi] getDowntimePatterns:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to analyze downtime patterns' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// WAVE 3 — Multi-factor Optimization
// ══════════════════════════════════════════════════════════════════════════════

// ── MNT-004: Smart Technician Suggestion ─────────────────────────────────────
exports.getTechnicianSuggestion = async (req, res) => {
  try {
    const { equipment_id, template_id } = req.query;

    // All active users as potential technicians
    const allUsers = await User.findAll({
      where:      { is_active: true },
      attributes: ['id', 'name', 'employee_id', 'department_id'],
      raw:        true,
    });

    // Open WO load per user
    const openWOs = await PmWorkOrder.findAll({
      where:      { status: { [Op.in]: ['open', 'in_progress'] } },
      attributes: ['assigned_to'],
      raw:        true,
    });
    const openWoMap = {};
    openWOs.forEach((w) => { if (w.assigned_to) openWoMap[w.assigned_to] = (openWoMap[w.assigned_to] || 0) + 1; });

    // Historical experience for this equipment/template combo
    const histWhere = { status: 'completed', completed_at: { [Op.ne]: null }, assigned_to: { [Op.ne]: null } };
    if (equipment_id) histWhere.equipment_id = parseInt(equipment_id, 10);
    if (template_id)  histWhere.template_id  = parseInt(template_id, 10);

    const completedWOs = await PmWorkOrder.findAll({
      where:      histWhere,
      attributes: ['assigned_to', 'actual_duration_minutes'],
      raw:        true,
    });

    const techHistory = {};
    completedWOs.forEach((wo) => {
      const uid = wo.assigned_to;
      if (!techHistory[uid]) techHistory[uid] = { count: 0, totalDuration: 0 };
      techHistory[uid].count++;
      techHistory[uid].totalDuration += wo.actual_duration_minutes || 60;
    });

    const maxExp = Math.max(1, ...Object.values(techHistory).map((h) => h.count));

    const scored = allUsers.map((user) => {
      const openCount  = openWoMap[user.id] || 0;
      const hist       = techHistory[user.id] || { count: 0, totalDuration: 0 };
      const avgDur     = hist.count > 0 ? Math.round(hist.totalDuration / hist.count) : null;

      const availScore = 1 / (1 + openCount);
      const expScore   = hist.count / maxExp;
      // Speed: 0 experience → 0.5 neutral; faster than 60 min → higher; slower → lower
      const speedScore = avgDur !== null ? Math.max(0, 1 - Math.max(0, avgDur - 30) / 210) : 0.5;

      return {
        user_id:              user.id,
        name:                 user.name,
        employee_id:          user.employee_id,
        open_wo_count:        openCount,
        experience_count:     hist.count,
        avg_duration_minutes: avgDur,
        score:                parseFloat((availScore * 0.4 + expScore * 0.3 + speedScore * 0.3).toFixed(3)),
      };
    });

    // Prefer technicians with any experience or with low load
    const suggestions = scored
      .filter((s) => s.experience_count > 0 || s.open_wo_count < 5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return res.json({ success: true, data: suggestions });
  } catch (err) {
    console.error('[maintenanceAi] getTechnicianSuggestion:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to suggest technician' });
  }
};

// ── MNT-009: Spare Parts Demand Forecast ─────────────────────────────────────
exports.getSpareDemandForecast = async (req, res) => {
  try {
    const { equipment_id } = req.query;
    if (!equipment_id) {
      return res.status(400).json({ success: false, message: 'equipment_id query param is required' });
    }

    const equip = await Equipment.findByPk(equipment_id, { attributes: ['id', 'equipment_code', 'name', 'installation_date', 'status', 'criticality'], raw: true });
    if (!equip) return res.status(404).json({ success: false, message: 'Equipment not found' });

    // Equipment age factor
    let ageFactor = 1.0;
    if (equip.installation_date) {
      const ageYears = (Date.now() - new Date(equip.installation_date)) / (365.25 * 864e5);
      if (ageYears > 7)      ageFactor = 1.35;
      else if (ageYears > 5) ageFactor = 1.20;
      else if (ageYears > 3) ageFactor = 1.10;
      else if (ageYears < 1) ageFactor = 0.85;
    }
    // Criticality multiplier (critical equipment = more conservative stocking)
    const critMultiplier = { A: 1.2, B: 1.0, C: 0.9 }[equip.criticality] || 1.0;

    // Get BOM parts
    const bomItems = await SparePartBom.findAll({ where: { equipment_id: parseInt(equipment_id, 10) }, raw: true });
    if (bomItems.length === 0) {
      return res.json({ success: true, data: [], message: 'No BOM defined for this equipment', equipment: equip });
    }

    const partIds        = bomItems.map((b) => b.spare_part_id);
    const sixMonthsAgo   = new Date(Date.now() - 180 * 864e5);

    const [parts, consumptionRows] = await Promise.all([
      SparePart.findAll({ where: { id: partIds }, attributes: ['id', 'part_code', 'name', 'unit_of_measure', 'current_stock', 'min_stock', 'unit_cost'], raw: true }),
      SparePartConsumption.findAll({
        where:      { spare_part_id: partIds, consumed_at: { [Op.gte]: sixMonthsAgo } },
        attributes: ['spare_part_id', 'quantity_consumed', 'consumed_at'],
        raw:        true,
      }),
    ]);

    const partMap = {};
    parts.forEach((p) => { partMap[p.id] = p; });

    // Consumption per part → monthly avg
    const consumptionByPart = {};
    consumptionRows.forEach((c) => {
      const pid = c.spare_part_id;
      if (!consumptionByPart[pid]) consumptionByPart[pid] = 0;
      consumptionByPart[pid] += parseFloat(c.quantity_consumed) || 0;
    });

    const forecasts = bomItems.map((bom) => {
      const part      = partMap[bom.spare_part_id] || {};
      const totalConsumed6m = consumptionByPart[bom.spare_part_id] || 0;
      const monthlyAvg      = totalConsumed6m / 6;
      const forecast3m      = parseFloat((monthlyAvg * 3 * ageFactor * critMultiplier).toFixed(3));
      const currentStock    = parseFloat(part.current_stock || 0);
      const shortfall       = parseFloat((forecast3m - currentStock).toFixed(3));

      let action;
      if (forecast3m === 0)      action = 'no_consumption_history';
      else if (shortfall > 0)    action = 'stock_up';
      else if (shortfall > -monthlyAvg) action = 'monitor';
      else                       action = 'adequate';

      return {
        spare_part_id:    bom.spare_part_id,
        part_code:        part.part_code,
        part_name:        part.name,
        unit_of_measure:  part.unit_of_measure,
        quantity_per_bom: parseFloat(bom.quantity_required),
        current_stock:    currentStock,
        min_stock:        parseFloat(part.min_stock || 0),
        consumed_6m:      parseFloat(totalConsumed6m.toFixed(3)),
        monthly_avg:      parseFloat(monthlyAvg.toFixed(3)),
        forecast_3m:      forecast3m,
        shortfall:        shortfall > 0 ? shortfall : 0,
        age_factor:       ageFactor,
        action,
        unit_cost:        part.unit_cost ? parseFloat(part.unit_cost) : null,
        replenishment_cost: part.unit_cost && shortfall > 0 ? parseFloat((shortfall * parseFloat(part.unit_cost)).toFixed(2)) : null,
      };
    });

    const priority = { stock_up: 3, monitor: 2, adequate: 1, no_consumption_history: 0 };
    forecasts.sort((a, b) => (priority[b.action] || 0) - (priority[a.action] || 0));

    return res.json({
      success: true,
      data:    forecasts,
      summary: {
        equipment_code:    equip.equipment_code,
        equipment_name:    equip.name,
        age_factor:        ageFactor,
        crit_multiplier:   critMultiplier,
        parts_count:       forecasts.length,
        stock_up_count:    forecasts.filter((f) => f.action === 'stock_up').length,
        total_replenishment_cost: parseFloat(forecasts.reduce((s, f) => s + (f.replenishment_cost || 0), 0).toFixed(2)),
      },
    });
  } catch (err) {
    console.error('[maintenanceAi] getSpareDemandForecast:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to forecast spare part demand' });
  }
};

// ── MNT-015: Smart Maintenance Schedule Optimizer ────────────────────────────
exports.getSmartSchedule = async (req, res) => {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 864e5);
    const today         = new Date().toISOString().slice(0, 10);
    const twoWeeksOut   = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);

    // Get all open PM WOs with equipment
    const openWOs = await PmWorkOrder.findAll({
      where:      { status: { [Op.in]: ['open', 'in_progress'] } },
      attributes: ['id', 'wo_number', 'equipment_id', 'template_id', 'assigned_to', 'planned_date', 'status'],
      raw:        true,
    });
    if (openWOs.length === 0) return res.json({ success: true, data: [], message: 'No open PM work orders' });

    const equipIds = [...new Set(openWOs.map((w) => w.equipment_id))];

    // Fetch equipment data
    const equipList = await Equipment.findAll({
      where:      { id: equipIds },
      attributes: ['id', 'equipment_code', 'name', 'criticality', 'machine_id', 'installation_date'],
      raw:        true,
    });
    const equipMap = {};
    equipList.forEach((e) => { equipMap[e.id] = e; });

    // Breakdown counts per equipment (last 90 days) for risk scoring
    const bdCounts = await BreakdownRequest.findAll({
      where:      { equipment_id: equipIds, createdAt: { [Op.gte]: ninetyDaysAgo } },
      attributes: ['equipment_id'],
      raw:        true,
    });
    const bdCountMap = {};
    bdCounts.forEach((b) => { bdCountMap[b.equipment_id] = (bdCountMap[b.equipment_id] || 0) + 1; });

    // Production schedules for next 14 days (to detect gaps)
    const machineIds = equipList.map((e) => e.machine_id).filter(Boolean);
    const prodScheds = machineIds.length > 0 ? await ProductionSchedule.findAll({
      where:      { machine_id: machineIds, schedule_date: { [Op.between]: [today, twoWeeksOut] }, status: { [Op.in]: ['draft', 'published'] } },
      attributes: ['machine_id', 'schedule_date'],
      raw:        true,
    }) : [];
    const schedDaysPerMachine = {};
    prodScheds.forEach((s) => { schedDaysPerMachine[s.machine_id] = (schedDaysPerMachine[s.machine_id] || 0) + 1; });

    // Open WO counts per assigned technician
    const assigneeMap = {};
    openWOs.forEach((w) => { if (w.assigned_to) assigneeMap[w.assigned_to] = (assigneeMap[w.assigned_to] || 0) + 1; });

    // BOM stock readiness (any BOM parts below min_stock?)
    const bomItems = await SparePartBom.findAll({
      where:      { equipment_id: equipIds },
      attributes: ['equipment_id', 'spare_part_id', 'quantity_required'],
      raw:        true,
    });
    const partIds = [...new Set(bomItems.map((b) => b.spare_part_id))];
    let partStockMap = {};
    if (partIds.length > 0) {
      const parts = await SparePart.findAll({ where: { id: partIds }, attributes: ['id', 'current_stock', 'min_stock'], raw: true });
      parts.forEach((p) => { partStockMap[p.id] = { current: parseFloat(p.current_stock), min: parseFloat(p.min_stock) }; });
    }
    // Per equipment: fraction of BOM parts with adequate stock
    const bomReadinessMap = {};
    const bomByEquip = {};
    bomItems.forEach((b) => { if (!bomByEquip[b.equipment_id]) bomByEquip[b.equipment_id] = []; bomByEquip[b.equipment_id].push(b); });
    for (const [eid, items] of Object.entries(bomByEquip)) {
      const total    = items.length;
      const adequate = items.filter((b) => (partStockMap[b.spare_part_id]?.current ?? 0) >= b.quantity_required).length;
      bomReadinessMap[parseInt(eid, 10)] = total > 0 ? adequate / total : 1.0;
    }

    // Batch opportunity: equipment with >1 open WO
    const woCountPerEquip = {};
    openWOs.forEach((w) => { woCountPerEquip[w.equipment_id] = (woCountPerEquip[w.equipment_id] || 0) + 1; });

    const CRIT_SCORE = { A: 1.0, B: 0.65, C: 0.35 };

    const scored = openWOs.map((wo) => {
      const eq           = equipMap[wo.equipment_id] || {};
      const critScore    = CRIT_SCORE[eq.criticality] || 0.5;
      const bdCount      = bdCountMap[wo.equipment_id] || 0;
      const bdRisk       = Math.min(1.0, bdCount / 5);   // 5+ breakdowns = max risk
      const riskScore    = critScore * 0.6 + bdRisk * 0.4;  // equipment risk component

      // Production gap: 0 prod days = full gap; 5+ = tight
      const prodDays    = eq.machine_id ? (schedDaysPerMachine[eq.machine_id] || 0) : 0;
      const gapScore    = Math.max(0, 1 - prodDays / 7);

      // Technician availability
      const openWoLoad  = wo.assigned_to ? (assigneeMap[wo.assigned_to] || 0) : 0;
      const techScore   = 1 / (1 + openWoLoad * 0.3);

      // Spare parts readiness
      const partsScore  = bomReadinessMap[wo.equipment_id] !== undefined ? bomReadinessMap[wo.equipment_id] : 1.0;

      // Batch opportunity
      const batchScore  = woCountPerEquip[wo.equipment_id] > 1 ? 1.0 : 0.0;

      // Weighted composite score
      const composite   = parseFloat((
        gapScore   * 0.40 +
        riskScore  * 0.25 +
        techScore  * 0.20 +
        partsScore * 0.10 +
        batchScore * 0.05
      ).toFixed(3));

      // Due date urgency — overdue WOs flagged
      const daysUntilDue = wo.planned_date
        ? Math.round((new Date(wo.planned_date) - new Date(today)) / 864e5)
        : null;

      // Recommend scheduling: overdue → ASAP; else use planned date or best production gap day
      let recommended_date = wo.planned_date || today;
      if (daysUntilDue !== null && daysUntilDue < 0) recommended_date = today;

      return {
        wo_id:              wo.id,
        wo_number:          wo.wo_number,
        equipment_id:       wo.equipment_id,
        equipment_code:     eq.equipment_code,
        equipment_name:     eq.name,
        criticality:        eq.criticality,
        planned_date:       wo.planned_date,
        days_until_due:     daysUntilDue,
        is_overdue:         daysUntilDue !== null && daysUntilDue < 0,
        recommended_date,
        composite_score:    composite,
        score_breakdown: {
          production_gap:     parseFloat(gapScore.toFixed(3)),
          equipment_risk:     parseFloat(riskScore.toFixed(3)),
          technician_load:    parseFloat(techScore.toFixed(3)),
          parts_readiness:    parseFloat(partsScore.toFixed(3)),
          batch_opportunity:  batchScore,
        },
        batch_eligible:     woCountPerEquip[wo.equipment_id] > 1,
        parts_ready:        partsScore === 1.0,
        breakdown_count_90d: bdCount,
      };
    });

    // Sort: overdue first, then by composite score descending
    scored.sort((a, b) => {
      if (a.is_overdue !== b.is_overdue) return a.is_overdue ? -1 : 1;
      return b.composite_score - a.composite_score;
    });

    const batchable = Object.entries(woCountPerEquip)
      .filter(([, cnt]) => cnt > 1)
      .map(([eid, cnt]) => ({ equipment_id: parseInt(eid), wo_count: cnt, equipment: equipMap[parseInt(eid)] ? `${equipMap[parseInt(eid)].equipment_code} — ${equipMap[parseInt(eid)].name}` : eid }));

    return res.json({
      success: true,
      data:    scored,
      summary: {
        total_open_wos:  openWOs.length,
        overdue_count:   scored.filter((s) => s.is_overdue).length,
        batch_groups:    batchable,
        parts_not_ready: scored.filter((s) => !s.parts_ready).length,
      },
    });
  } catch (err) {
    console.error('[maintenanceAi] getSmartSchedule:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to generate smart schedule' });
  }
};
