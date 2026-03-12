const {
  Mold, MoldPmTemplate, MoldPmTemplateItem, MoldPmSchedule,
  MoldPmWorkOrder, MoldPmChecklistResult, MoldPmPhoto, User,
} = require('../../../models');
const { createTemplate, scheduleTemplate, completePmWorkOrder } = require('../cred/moldPm.cred');

// GET /mold/pm/templates
const getTemplates = async (req, res) => {
  try {
    const { category_id, is_active } = req.query;
    const where = {};
    if (category_id) where.category_id = category_id;
    if (is_active !== undefined) where.is_active = is_active === 'true';
    const templates = await MoldPmTemplate.findAll({
      where,
      include: [{ model: MoldPmTemplateItem, as: 'Items', order: [['step_number', 'ASC']] }],
      order: [['name', 'ASC']],
    });
    return res.json({ success: true, data: templates });
  } catch (err) {
    console.error('[MoldPm.getTemplates]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /mold/pm/templates
const createPmTemplate = async (req, res) => {
  try {
    const { error, value } = createTemplate.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.message });
    const { items = [], ...tmplData } = value;
    tmplData.created_by = req.user?.id;
    const template = await MoldPmTemplate.create(tmplData);
    if (items.length > 0) {
      const rows = items.map((i) => ({ ...i, template_id: template.id, created_by: req.user?.id }));
      await MoldPmTemplateItem.bulkCreate(rows);
    }
    const result = await MoldPmTemplate.findByPk(template.id, {
      include: [{ model: MoldPmTemplateItem, as: 'Items', order: [['step_number', 'ASC']] }],
    });
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error('[MoldPm.createPmTemplate]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /mold/pm/schedules?mold_id=&status=
const getSchedules = async (req, res) => {
  try {
    const { mold_id, status } = req.query;
    const where = {};
    if (mold_id) where.mold_id = mold_id;
    if (status)  where.status  = status;
    const schedules = await MoldPmSchedule.findAll({
      where,
      include: [
        { model: Mold,           as: 'Mold',     attributes: ['id', 'mold_code', 'name', 'current_shot_count'] },
        { model: MoldPmTemplate, as: 'Template', attributes: ['id', 'name', 'trigger_type', 'shot_interval', 'time_interval_days'] },
      ],
      order: [['next_due_shots', 'ASC']],
    });
    return res.json({ success: true, data: schedules });
  } catch (err) {
    console.error('[MoldPm.getSchedules]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /mold/pm/:moldId/schedule
const schedulePm = async (req, res) => {
  try {
    const { moldId } = req.params;
    const { error, value } = scheduleTemplate.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.message });
    const mold = await Mold.findByPk(moldId);
    if (!mold) return res.status(404).json({ success: false, message: 'Mold not found' });
    const template = await MoldPmTemplate.findByPk(value.template_id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    const nextShots = template.trigger_type !== 'time_based'
      ? (mold.current_shot_count || 0) + (template.shot_interval || 0)
      : null;
    const schedule = await MoldPmSchedule.create({
      mold_id: moldId, template_id: value.template_id,
      next_due_shots: nextShots, status: 'pending', created_by: req.user?.id,
    });
    return res.status(201).json({ success: true, data: schedule });
  } catch (err) {
    console.error('[MoldPm.schedulePm]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /mold/pm/schedules/:scheduleId/open
const openPmWorkOrder = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const schedule = await MoldPmSchedule.findByPk(scheduleId);
    if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });
    const wo = await MoldPmWorkOrder.create({
      schedule_id: scheduleId, mold_id: schedule.mold_id, status: 'open', created_by: req.user?.id,
    });
    await schedule.update({ status: 'in_progress' });
    return res.status(201).json({ success: true, data: wo });
  } catch (err) {
    console.error('[MoldPm.openPmWorkOrder]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /mold/pm/work-orders/:woId
const getPmWorkOrder = async (req, res) => {
  try {
    const wo = await MoldPmWorkOrder.findByPk(req.params.woId, {
      include: [
        { model: Mold,                  as: 'Mold',             attributes: ['id', 'mold_code', 'name', 'current_shot_count'] },
        { model: MoldPmChecklistResult, as: 'ChecklistResults' },
        { model: MoldPmPhoto,           as: 'Photos' },
        { model: User,                  as: 'AssignedTo',       attributes: ['id', 'name', 'employee_id'] },
      ],
    });
    if (!wo) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, data: wo });
  } catch (err) {
    console.error('[MoldPm.getPmWorkOrder]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /mold/pm/work-orders/:woId/complete
const completePm = async (req, res) => {
  try {
    const { woId } = req.params;
    const { error, value } = completePmWorkOrder.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.message });
    const wo = await MoldPmWorkOrder.findByPk(woId);
    if (!wo) return res.status(404).json({ success: false, message: 'PM Work Order not found' });
    await wo.update({
      status: 'completed', completed_at: new Date(),
      technician_notes: value.technician_notes, updated_by: req.user?.id,
    });
    if (value.checklist?.length > 0) {
      const rows = value.checklist.map((c) => ({
        pm_work_order_id: wo.id, template_item_id: c.template_item_id,
        result: c.result, finding: c.finding, completed_by: req.user?.id, completed_at: new Date(),
      }));
      await MoldPmChecklistResult.bulkCreate(rows);
    }
    const mold = await Mold.findByPk(wo.mold_id);
    const schedule = await MoldPmSchedule.findByPk(wo.schedule_id, {
      include: [{ model: MoldPmTemplate, as: 'Template' }],
    });
    if (schedule?.Template) {
      const nextShots = schedule.Template.trigger_type !== 'time_based' && schedule.Template.shot_interval
        ? (mold?.current_shot_count || 0) + schedule.Template.shot_interval
        : null;
      await schedule.update({
        status: 'completed', last_completed_at: new Date(),
        last_completed_shots: mold?.current_shot_count, next_due_shots: nextShots,
      });
    }
    return res.json({ success: true, message: 'PM work order completed' });
  } catch (err) {
    console.error('[MoldPm.completePm]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getTemplates, createPmTemplate, getSchedules, schedulePm, openPmWorkOrder, getPmWorkOrder, completePm };
