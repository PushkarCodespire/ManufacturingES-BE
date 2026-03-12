'use strict';
const { Op, fn, col, literal } = require('sequelize');
const {
  PmTemplate, PmTemplateItem, PmSchedule, PmWorkOrder, PmWoChecklist,
  Equipment, EquipmentCategory, MaintenanceType, User,
} = require('../../../models');

async function genPmWoNumber() {
  const yr = new Date().getFullYear();
  const last = await PmWorkOrder.findOne({ where: { wo_number: { [Op.like]: `MWO-P-${yr}-%` } }, order: [['id', 'DESC']] });
  const seq = last ? parseInt(last.wo_number.split('-')[3], 10) + 1 : 1;
  return `MWO-P-${yr}-${String(seq).padStart(4, '0')}`;
}

function calcNextDue(fromDate, tmpl) {
  const d = new Date(fromDate || Date.now());
  const map = { daily: 1, weekly: 7, monthly: 30, quarterly: 91, semi_annual: 182, annual: 365 };
  const days = tmpl.frequency_type === 'custom' ? (tmpl.frequency_days || 30) : (map[tmpl.frequency_type] || 30);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

exports.getTemplates = async (req, res) => {
  try {
    const where = { is_active: true };
    if (req.query.search) where.name = { [Op.iLike]: `%${req.query.search}%` };
    const rows = await PmTemplate.findAll({
      where,
      include: [
        { model: EquipmentCategory, as: 'Category', attributes: ['id','name'] },
        { model: MaintenanceType,   as: 'MaintenanceType', attributes: ['id','name'] },
        { model: PmTemplateItem,    as: 'Items', order: [['step_number','ASC']] },
      ],
      order: [['name','ASC']],
    });
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.getTemplateById = async (req, res) => {
  try {
    const row = await PmTemplate.findByPk(req.params.id, {
      include: [
        { model: EquipmentCategory, as: 'Category' },
        { model: MaintenanceType,   as: 'MaintenanceType' },
        { model: PmTemplateItem,    as: 'Items', order: [['step_number','ASC']] },
      ],
    });
    if (!row) return res.status(404).json({ message: 'Template not found' });
    res.json({ data: row });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.createTemplate = async (req, res) => {
  try {
    const { items, ...fields } = req.body;
    fields.created_by = req.user?.id;
    const tmpl = await PmTemplate.create(fields);
    if (items?.length) {
      await PmTemplateItem.bulkCreate(items.map((it, i) => ({ ...it, template_id: tmpl.id, step_number: it.step_number || i + 1, created_by: req.user?.id })));
    }
    const full = await PmTemplate.findByPk(tmpl.id, { include: [{ model: PmTemplateItem, as: 'Items' }] });
    res.status(201).json({ data: full });
  } catch (e) { res.status(400).json({ message: e.message }); }
};

exports.updateTemplate = async (req, res) => {
  try {
    const tmpl = await PmTemplate.findByPk(req.params.id);
    if (!tmpl) return res.status(404).json({ message: 'Not found' });
    const { items, ...fields } = req.body;
    fields.updated_by = req.user?.id;
    await tmpl.update(fields);
    if (items) {
      await PmTemplateItem.destroy({ where: { template_id: tmpl.id } });
      await PmTemplateItem.bulkCreate(items.map((it, i) => ({ ...it, template_id: tmpl.id, step_number: it.step_number || i + 1, created_by: req.user?.id })));
    }
    res.json({ data: tmpl });
  } catch (e) { res.status(400).json({ message: e.message }); }
};
exports.getSchedules = async (req, res) => {
  try {
    const where = {};
    if (req.query.equipment_id) where.equipment_id = req.query.equipment_id;
    if (req.query.status) where.status = req.query.status;
    const rows = await PmSchedule.findAll({
      where,
      include: [
        { model: Equipment,   as: 'Equipment',   attributes: ['id','equipment_code','name','criticality'] },
        { model: PmTemplate,  as: 'Template',    attributes: ['id','name','frequency_type','estimated_duration_minutes'] },
      ],
      order: [['next_due_date','ASC']],
    });
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.createSchedule = async (req, res) => {
  try {
    const data = { ...req.body, created_by: req.user?.id };
    const sched = await PmSchedule.create(data);
    res.status(201).json({ data: sched });
  } catch (e) { res.status(400).json({ message: e.message }); }
};

exports.updateSchedule = async (req, res) => {
  try {
    const sched = await PmSchedule.findByPk(req.params.id);
    if (!sched) return res.status(404).json({ message: 'Not found' });
    await sched.update({ ...req.body, updated_by: req.user?.id });
    res.json({ data: sched });
  } catch (e) { res.status(400).json({ message: e.message }); }
};

exports.autoGenerateWOs = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const schedules = await PmSchedule.findAll({
      where: {
        status: 'active',
        next_due_date: { [Op.lte]: literal("CURRENT_DATE + INTERVAL '7 days'") },
      },
      include: [{ model: PmTemplate, as: 'Template', include: [{ model: PmTemplateItem, as: 'Items' }] }],
    });
    const created = [];
    for (const sched of schedules) {
      const existing = await PmWorkOrder.findOne({
        where: { schedule_id: sched.id, status: { [Op.notIn]: ['cancelled','skipped'] }, planned_date: sched.next_due_date },
      });
      if (existing) continue;
      const wo_number = await genPmWoNumber();
      const wo = await PmWorkOrder.create({
        wo_number, schedule_id: sched.id, equipment_id: sched.equipment_id,
        template_id: sched.template_id, planned_date: sched.next_due_date,
        status: 'open', created_by: req.user?.id,
      });
      if (sched.Template?.Items?.length) {
        await PmWoChecklist.bulkCreate(sched.Template.Items.map((item) => ({
          pm_wo_id: wo.id, template_item_id: item.id, status: 'pending',
        })));
      }
      created.push(wo_number);
    }
    res.json({ data: { message: `Generated ${created.length} PM Work Orders`, created } });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.getWorkOrders = async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.equipment_id) where.equipment_id = req.query.equipment_id;
    const rows = await PmWorkOrder.findAll({
      where,
      include: [
        { model: Equipment,   as: 'Equipment',   attributes: ['id','equipment_code','name'] },
        { model: PmTemplate,  as: 'Template',    attributes: ['id','name','estimated_duration_minutes'] },
        { model: User,        as: 'AssignedTo',  attributes: ['id','name'] },
      ],
      order: [['planned_date','ASC']],
    });
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.getWorkOrderById = async (req, res) => {
  try {
    const wo = await PmWorkOrder.findByPk(req.params.woId, {
      include: [
        { model: Equipment,   as: 'Equipment' },
        { model: PmTemplate,  as: 'Template', include: [{ model: PmTemplateItem, as: 'Items', order: [['step_number','ASC']] }] },
        { model: User,        as: 'AssignedTo', attributes: ['id','name'] },
        { model: PmWoChecklist, as: 'Checklist', include: [{ model: PmTemplateItem, as: 'TemplateItem' }, { model: User, as: 'CompletedBy', attributes: ['id','name'] }] },
      ],
    });
    if (!wo) return res.status(404).json({ message: 'WO not found' });
    res.json({ data: wo });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.completeWorkOrder = async (req, res) => {
  try {
    const wo = await PmWorkOrder.findByPk(req.params.woId, {
      include: [{ model: PmSchedule, as: 'Schedule' }, { model: PmTemplate, as: 'Template' }],
    });
    if (!wo) return res.status(404).json({ message: 'WO not found' });
    const mandatoryPending = await PmWoChecklist.findOne({
      where: { pm_wo_id: wo.id, status: 'pending' },
      include: [{ model: PmTemplateItem, as: 'TemplateItem', where: { is_mandatory: true } }],
    });
    if (mandatoryPending) return res.status(400).json({ message: 'All mandatory checklist items must be completed first' });
    const now = new Date();
    const duration = wo.started_at ? Math.round((now - new Date(wo.started_at)) / 60000) : null;
    await wo.update({ status: 'completed', completed_at: now, actual_duration_minutes: duration, completion_notes: req.body.completion_notes });
    if (wo.Schedule && wo.Template) {
      const nextDue = calcNextDue(now, wo.Template);
      await wo.Schedule.update({ last_completed_date: now.toISOString().slice(0, 10), next_due_date: nextDue });
    }
    res.json({ data: wo, message: 'PM Work Order completed' });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.startWorkOrder = async (req, res) => {
  try {
    const wo = await PmWorkOrder.findByPk(req.params.woId);
    if (!wo) return res.status(404).json({ message: 'Not found' });
    await wo.update({ status: 'in_progress', started_at: new Date() });
    res.json({ data: wo });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.updateChecklistItem = async (req, res) => {
  try {
    const item = await PmWoChecklist.findOne({ where: { pm_wo_id: req.params.woId, id: req.params.itemId } });
    if (!item) return res.status(404).json({ message: 'Checklist item not found' });
    await item.update({ ...req.body, completed_by: req.user?.id, completed_at: new Date() });
    res.json({ data: item });
  } catch (e) { res.status(400).json({ message: e.message }); }
};