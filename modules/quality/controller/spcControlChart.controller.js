const { Op } = require('sequelize');
const {
  SpcConfig, SpcReading, Item, User, Ncr,
  IqcInspection, IqcInspectionResult,
  LqcInspection, LqcInspectionResult,
  PqcInspection, PqcInspectionResult,
  OqcInspection, OqcInspectionResult,
} = require('../../../models');
const { generateAutoNumber } = require('../../../utils/autoNumber');

// ── A2, D3, D4 constants for X-bar/R charts (subgroup size 2–10) ─────────────
const A2 = { 2: 1.880, 3: 1.023, 4: 0.729, 5: 0.577, 6: 0.483, 7: 0.419, 8: 0.373, 9: 0.337, 10: 0.308 };
const D3 = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0.076, 8: 0.136, 9: 0.184, 10: 0.223 };
const D4 = { 2: 3.267, 3: 2.574, 4: 2.282, 5: 2.114, 6: 2.004, 7: 1.924, 8: 1.864, 9: 1.816, 10: 1.777 };

// ── Inspection model map ─────────────────────────────────────────────────────
const SOURCE_MAP = {
  iqc: { Inspection: IqcInspection, Result: IqcInspectionResult, dateField: 'inspection_date' },
  lqc: { Inspection: LqcInspection, Result: LqcInspectionResult, dateField: 'inspection_date' },
  pqc: { Inspection: PqcInspection, Result: PqcInspectionResult, dateField: 'inspection_date' },
  oqc: { Inspection: OqcInspection, Result: OqcInspectionResult, dateField: 'inspection_date' },
};

// ── NCR auto-number shorthand ─────────────────────────────────────────────────
const nextNcrNo = () => generateAutoNumber(Ncr, 'ncr_no', 'NCR');

// ── Western Electric Rules ───────────────────────────────────────────────────
function checkWesternElectric(readings, cl, ucl, lcl) {
  const sigma = (ucl - cl) / 3;
  const sigma2 = sigma * 2;
  const violations = [];

  for (let i = 0; i < readings.length; i++) {
    const val = readings[i];
    let rule = null;

    // Rule 1: One point beyond 3σ
    if (val > ucl || val < lcl) {
      rule = 'Rule 1: Point beyond 3σ';
    }

    // Rule 2: Two of three consecutive points beyond 2σ (same side)
    if (!rule && i >= 2) {
      const above2s = [i - 2, i - 1, i].filter((j) => readings[j] > cl + sigma2).length;
      const below2s = [i - 2, i - 1, i].filter((j) => readings[j] < cl - sigma2).length;
      if (above2s >= 2 || below2s >= 2) rule = 'Rule 2: 2 of 3 beyond 2σ';
    }

    // Rule 3: Four of five consecutive points beyond 1σ (same side)
    if (!rule && i >= 4) {
      const above1s = [i - 4, i - 3, i - 2, i - 1, i].filter((j) => readings[j] > cl + sigma).length;
      const below1s = [i - 4, i - 3, i - 2, i - 1, i].filter((j) => readings[j] < cl - sigma).length;
      if (above1s >= 4 || below1s >= 4) rule = 'Rule 3: 4 of 5 beyond 1σ';
    }

    // Rule 4: Eight consecutive points on same side of center line
    if (!rule && i >= 7) {
      const last8 = readings.slice(i - 7, i + 1);
      if (last8.every((v) => v > cl) || last8.every((v) => v < cl)) {
        rule = 'Rule 4: 8 consecutive same side';
      }
    }

    violations.push(rule);
  }
  return violations;
}

// ── GET /quality/spc/configs ─────────────────────────────────────────────────
const getConfigs = async (req, res) => {
  try {
    const configs = await SpcConfig.findAll({
      include: [
        { model: Item, as: 'Item', attributes: ['id', 'code', 'name'] },
        { model: User, as: 'Creator', attributes: ['id', 'name'], required: false },
      ],
      order: [['created_at', 'DESC']],
    });
    return res.json({ success: true, data: configs });
  } catch (err) {
    console.error('[spc/getConfigs]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// ── POST /quality/spc/configs ────────────────────────────────────────────────
const createConfig = async (req, res) => {
  try {
    const { item_id, parameter_name, chart_type, subgroup_size, usl, lsl, data_source } = req.body;
    if (!item_id || !parameter_name) {
      return res.status(400).json({ success: false, message: 'item_id and parameter_name are required' });
    }

    const config = await SpcConfig.create({
      item_id,
      parameter_name,
      chart_type: chart_type || 'xbar_r',
      subgroup_size: subgroup_size || 5,
      usl: usl || null,
      lsl: lsl || null,
      data_source: data_source || 'lqc',
      created_by: req.user?.id || null,
    });

    const full = await SpcConfig.findByPk(config.id, {
      include: [{ model: Item, as: 'Item', attributes: ['id', 'code', 'name'] }],
    });
    return res.status(201).json({ success: true, data: full });
  } catch (err) {
    console.error('[spc/createConfig]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// ── PATCH /quality/spc/configs/:id ───────────────────────────────────────────
const updateConfig = async (req, res) => {
  try {
    const config = await SpcConfig.findByPk(req.params.id);
    if (!config) return res.status(404).json({ success: false, message: 'Config not found' });

    const { parameter_name, chart_type, subgroup_size, usl, lsl, data_source, is_active } = req.body;
    await config.update({
      ...(parameter_name !== undefined && { parameter_name }),
      ...(chart_type !== undefined && { chart_type }),
      ...(subgroup_size !== undefined && { subgroup_size }),
      ...(usl !== undefined && { usl }),
      ...(lsl !== undefined && { lsl }),
      ...(data_source !== undefined && { data_source }),
      ...(is_active !== undefined && { is_active }),
    });

    return res.json({ success: true, data: config });
  } catch (err) {
    console.error('[spc/updateConfig]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// ── DELETE /quality/spc/configs/:id ──────────────────────────────────────────
const deleteConfig = async (req, res) => {
  try {
    const config = await SpcConfig.findByPk(req.params.id);
    if (!config) return res.status(404).json({ success: false, message: 'Config not found' });
    await SpcReading.destroy({ where: { spc_config_id: config.id } });
    await config.destroy();
    return res.json({ success: true, message: 'SPC config deleted' });
  } catch (err) {
    console.error('[spc/deleteConfig]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// ── POST /quality/spc/configs/:id/calculate — Main SPC engine ────────────────
const calculate = async (req, res) => {
  try {
    const config = await SpcConfig.findByPk(req.params.id, {
      include: [{ model: Item, as: 'Item', attributes: ['id', 'code', 'name'] }],
    });
    if (!config) return res.status(404).json({ success: false, message: 'Config not found' });

    const src = SOURCE_MAP[config.data_source];
    if (!src) return res.status(400).json({ success: false, message: `Unknown data source: ${config.data_source}` });

    // Fetch inspection IDs for this item
    const inspections = await src.Inspection.findAll({
      where: { item_id: config.item_id },
      attributes: ['id', src.dateField],
      order: [[src.dateField, 'ASC']],
      raw: true,
    });

    if (inspections.length === 0) {
      return res.json({ success: true, data: { config, readings: [], message: 'No inspection data found' } });
    }

    const inspIds = inspections.map((i) => i.id);
    const dateMap = {};
    for (const i of inspections) dateMap[i.id] = i[src.dateField];

    // Fetch actual values for this parameter
    const results = await src.Result.findAll({
      where: {
        inspection_id: { [Op.in]: inspIds },
        parameter_name: config.parameter_name,
      },
      attributes: ['inspection_id', 'actual_value', 'result'],
      raw: true,
    });

    if (results.length === 0) {
      return res.json({ success: true, data: { config, readings: [], message: 'No readings found for this parameter' } });
    }

    // Clear old readings
    await SpcReading.destroy({ where: { spc_config_id: config.id } });

    const n = config.subgroup_size;

    if (config.chart_type === 'xbar_r') {
      // ── X-bar & R Chart ──────────────────────────────────────────────────
      // Parse numeric values
      const numericResults = results
        .map((r) => ({ value: parseFloat(r.actual_value), date: dateMap[r.inspection_id] }))
        .filter((r) => !isNaN(r.value))
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

      if (numericResults.length < n) {
        return res.json({ success: true, data: { config, readings: [], message: `Need at least ${n} numeric readings, found ${numericResults.length}` } });
      }

      // Group into subgroups of size n
      const subgroups = [];
      for (let i = 0; i + n <= numericResults.length; i += n) {
        const group = numericResults.slice(i, i + n);
        const vals = group.map((g) => g.value);
        const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
        const range = Math.max(...vals) - Math.min(...vals);
        subgroups.push({
          subgroup_no: subgroups.length + 1,
          subgroup_date: group[0].date,
          x_bar: Math.round(mean * 10000) / 10000,
          range_value: Math.round(range * 10000) / 10000,
          sample_size: vals.length,
          values: vals,
        });
      }

      // Calculate control limits
      const xDoubleBar = subgroups.reduce((s, sg) => s + sg.x_bar, 0) / subgroups.length;
      const rBar = subgroups.reduce((s, sg) => s + sg.range_value, 0) / subgroups.length;

      const a2 = A2[n] || A2[5];
      const d3 = D3[n] || D3[5];
      const d4 = D4[n] || D4[5];

      const ucl = Math.round((xDoubleBar + a2 * rBar) * 10000) / 10000;
      const cl = Math.round(xDoubleBar * 10000) / 10000;
      const lcl = Math.round((xDoubleBar - a2 * rBar) * 10000) / 10000;
      const ucl_r = Math.round((d4 * rBar) * 10000) / 10000;
      const cl_r = Math.round(rBar * 10000) / 10000;
      const lcl_r = Math.round((d3 * rBar) * 10000) / 10000;

      // Update config with calculated limits
      await config.update({ ucl, cl, lcl, ucl_r, cl_r, lcl_r });

      // Check Western Electric rules on x_bar values
      const xBars = subgroups.map((sg) => sg.x_bar);
      const violations = checkWesternElectric(xBars, cl, ucl, lcl);

      // Save readings + auto-raise NCR on violations
      const readings = [];
      for (let i = 0; i < subgroups.length; i++) {
        const sg = subgroups[i];
        let ncrId = null;

        if (violations[i]) {
          // Auto-raise NCR
          const ncr_no = await nextNcrNo();
          const ncr = await Ncr.create({
            ncr_no,
            ncr_type: 'process',
            item_id: config.item_id,
            defect_desc: `SPC Violation: ${violations[i]} on parameter "${config.parameter_name}" (X-bar=${sg.x_bar}, UCL=${ucl}, LCL=${lcl})`,
            location_found: config.data_source,
            qty_affected: sg.sample_size,
            status: 'raised',
            created_by: req.user?.id || null,
          });
          ncrId = ncr.id;
        }

        const reading = await SpcReading.create({
          spc_config_id: config.id,
          subgroup_no: sg.subgroup_no,
          subgroup_date: sg.subgroup_date,
          x_bar: sg.x_bar,
          range_value: sg.range_value,
          sample_size: sg.sample_size,
          values: sg.values,
          violation: violations[i] || null,
          ncr_id: ncrId,
        });
        readings.push(reading);
      }

      return res.json({
        success: true,
        data: {
          config: await SpcConfig.findByPk(config.id, { include: [{ model: Item, as: 'Item', attributes: ['id', 'code', 'name'] }] }),
          readings,
          stats: {
            total_subgroups: subgroups.length,
            total_readings: numericResults.length,
            violations_count: violations.filter(Boolean).length,
            x_double_bar: cl,
            r_bar: cl_r,
          },
        },
      });
    } else {
      // ── P Chart ──────────────────────────────────────────────────────────
      // Group results by inspection (each inspection = one subgroup)
      const byInspection = {};
      for (const r of results) {
        if (!byInspection[r.inspection_id]) byInspection[r.inspection_id] = { total: 0, defective: 0, date: dateMap[r.inspection_id] };
        byInspection[r.inspection_id].total++;
        if (r.result === 'fail') byInspection[r.inspection_id].defective++;
      }

      const groups = Object.values(byInspection).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      if (groups.length === 0) {
        return res.json({ success: true, data: { config, readings: [], message: 'No data for p-chart' } });
      }

      const pBar = groups.reduce((s, g) => s + g.defective, 0) / groups.reduce((s, g) => s + g.total, 0);
      const avgN = groups.reduce((s, g) => s + g.total, 0) / groups.length;
      const pUcl = Math.min(1, Math.round((pBar + 3 * Math.sqrt(pBar * (1 - pBar) / avgN)) * 10000) / 10000);
      const pLcl = Math.max(0, Math.round((pBar - 3 * Math.sqrt(pBar * (1 - pBar) / avgN)) * 10000) / 10000);
      const pCl = Math.round(pBar * 10000) / 10000;

      await config.update({ ucl: pUcl, cl: pCl, lcl: pLcl, ucl_r: null, cl_r: null, lcl_r: null });

      const pValues = groups.map((g) => g.total > 0 ? g.defective / g.total : 0);
      const violations = checkWesternElectric(pValues, pCl, pUcl, pLcl);

      const readings = [];
      for (let i = 0; i < groups.length; i++) {
        const g = groups[i];
        let ncrId = null;

        if (violations[i]) {
          const ncr_no = await nextNcrNo();
          const ncr = await Ncr.create({
            ncr_no,
            ncr_type: 'process',
            item_id: config.item_id,
            defect_desc: `SPC Violation: ${violations[i]} on parameter "${config.parameter_name}" (p=${(pValues[i] * 100).toFixed(1)}%, UCL=${(pUcl * 100).toFixed(1)}%)`,
            location_found: config.data_source,
            qty_affected: g.total,
            status: 'raised',
            created_by: req.user?.id || null,
          });
          ncrId = ncr.id;
        }

        const reading = await SpcReading.create({
          spc_config_id: config.id,
          subgroup_no: i + 1,
          subgroup_date: g.date,
          p_value: Math.round(pValues[i] * 10000) / 10000,
          sample_size: g.total,
          violation: violations[i] || null,
          ncr_id: ncrId,
        });
        readings.push(reading);
      }

      return res.json({
        success: true,
        data: {
          config: await SpcConfig.findByPk(config.id, { include: [{ model: Item, as: 'Item', attributes: ['id', 'code', 'name'] }] }),
          readings,
          stats: {
            total_subgroups: groups.length,
            total_readings: results.length,
            violations_count: violations.filter(Boolean).length,
            p_bar: pCl,
          },
        },
      });
    }
  } catch (err) {
    console.error('[spc/calculate]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// ── GET /quality/spc/configs/:id/chart-data ──────────────────────────────────
const getChartData = async (req, res) => {
  try {
    const config = await SpcConfig.findByPk(req.params.id, {
      include: [{ model: Item, as: 'Item', attributes: ['id', 'code', 'name'] }],
    });
    if (!config) return res.status(404).json({ success: false, message: 'Config not found' });

    const readings = await SpcReading.findAll({
      where: { spc_config_id: config.id },
      order: [['subgroup_no', 'ASC']],
    });

    return res.json({ success: true, data: { config, readings } });
  } catch (err) {
    console.error('[spc/getChartData]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

module.exports = { getConfigs, createConfig, updateConfig, deleteConfig, calculate, getChartData };
