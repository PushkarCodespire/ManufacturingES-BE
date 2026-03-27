const { Op } = require('sequelize');
const { AuditPlan, AuditItem, AuditFinding, User, Capa } = require('../../../models');
const { generateAutoNumber } = require('../../../utils/autoNumber');

const nextPlanNo = () => generateAutoNumber(AuditPlan, 'plan_no', 'AUP');

// ── GET /audit-plans ──────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { year, status } = req.query;
    const where = {};
    if (year)   where.year   = parseInt(year, 10);
    if (status) where.status = status;

    const data = await AuditPlan.findAll({
      where,
      include: [
        { model: User, as: 'Creator',    attributes: ['id', 'name'], required: false },
        { model: User, as: 'ApprovedBy', attributes: ['id', 'name'], required: false },
        { model: AuditItem, as: 'Items', attributes: ['id', 'status'] },
      ],
      order: [['year', 'DESC'], ['created_at', 'DESC']],
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[auditPlan.getAll]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /audit-plans/:id ──────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const row = await AuditPlan.findByPk(req.params.id, {
      include: [
        { model: User, as: 'Creator',    attributes: ['id', 'name'], required: false },
        { model: User, as: 'ApprovedBy', attributes: ['id', 'name'], required: false },
        {
          model: AuditItem, as: 'Items',
          include: [
            { model: User, as: 'Auditor', attributes: ['id', 'name'], required: false },
            {
              model: AuditFinding, as: 'Findings',
              include: [{ model: User, as: 'RaisedBy', attributes: ['id', 'name'], required: false }],
            },
          ],
          order: [['scheduled_date', 'ASC']],
        },
      ],
    });
    if (!row) return res.status(404).json({ success: false, message: 'Audit plan not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('[auditPlan.getById]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /audit-plans ─────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { plan_name, year, standard, notes, items = [] } = req.body;
    if (!plan_name || !year) return res.status(400).json({ success: false, message: 'plan_name and year are required' });

    const plan_no = await nextPlanNo();
    const plan = await AuditPlan.create({
      plan_no, plan_name, year: parseInt(year, 10),
      standard: standard || 'ISO 9001:2015', notes,
      status: 'draft', created_by: req.user.id, updated_by: req.user.id,
    });

    if (items.length > 0) {
      await AuditItem.bulkCreate(
        items.map((it) => ({
          audit_plan_id:  plan.id,
          process_area:   it.process_area,
          clause_ref:     it.clause_ref || null,
          auditor_id:     it.auditor_id || null,
          scheduled_date: it.scheduled_date || null,
          duration_hrs:   it.duration_hrs || 1,
          status:         'scheduled',
        }))
      );
    }

    const full = await AuditPlan.findByPk(plan.id, {
      include: [
        { model: AuditItem, as: 'Items' },
        { model: User, as: 'Creator', attributes: ['id', 'name'], required: false },
      ],
    });
    res.status(201).json({ success: true, data: full });
  } catch (err) {
    console.error('[auditPlan.create]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /audit-plans/:id/approve ───────────────────────────────────────────
exports.approve = async (req, res) => {
  try {
    const plan = await AuditPlan.findByPk(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Audit plan not found' });
    if (plan.status !== 'draft') return res.status(400).json({ success: false, message: 'Only draft plans can be approved' });
    await plan.update({ status: 'approved', approved_by: req.user.id, approved_at: new Date() });
    res.json({ success: true, data: plan });
  } catch (err) {
    console.error('[auditPlan.approve]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /audit-plans/:id/items ───────────────────────────────────────────────
exports.addItem = async (req, res) => {
  try {
    const plan = await AuditPlan.findByPk(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Audit plan not found' });
    const { process_area, clause_ref, auditor_id, scheduled_date, duration_hrs } = req.body;
    if (!process_area) return res.status(400).json({ success: false, message: 'process_area is required' });

    const item = await AuditItem.create({
      audit_plan_id: plan.id, process_area,
      clause_ref: clause_ref || null, auditor_id: auditor_id || null,
      scheduled_date: scheduled_date || null, duration_hrs: duration_hrs || 1,
      status: 'scheduled',
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    console.error('[auditPlan.addItem]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /audit-plans/items/:itemId/execute ──────────────────────────────────
// Auditor records actual_date + finding_summary to mark item complete
exports.executeItem = async (req, res) => {
  try {
    const item = await AuditItem.findByPk(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Audit item not found' });

    const { actual_date, finding_summary, status = 'completed' } = req.body;
    await item.update({ actual_date: actual_date || new Date(), finding_summary, status });

    // Update plan to in_progress if still draft/approved
    const plan = await AuditPlan.findByPk(item.audit_plan_id);
    if (plan && ['approved', 'draft'].includes(plan.status)) {
      await plan.update({ status: 'in_progress' });
    }

    res.json({ success: true, data: item });
  } catch (err) {
    console.error('[auditPlan.executeItem]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /audit-plans/items/:itemId/findings ──────────────────────────────────
exports.addFinding = async (req, res) => {
  try {
    const item = await AuditItem.findByPk(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Audit item not found' });

    const { finding_type, clause_ref, description, evidence } = req.body;
    if (!description) return res.status(400).json({ success: false, message: 'description is required' });

    const finding = await AuditFinding.create({
      audit_item_id: item.id, finding_type: finding_type || 'observation',
      clause_ref: clause_ref || null, description, evidence: evidence || null,
      status: 'open', raised_by: req.user.id,
    });

    // Auto-create CAPA for major/minor NCs
    let capa_no = null;
    if (['major_nc', 'minor_nc'].includes(finding_type)) {
      try {
        const year = new Date().getFullYear();
        const lastCapa = await Capa.findOne({ order: [['created_at', 'DESC']], attributes: ['capa_no'] });
        const seq = lastCapa ? parseInt(lastCapa.capa_no.split('-').pop(), 10) + 1 : 1;
        capa_no = `CAPA-${year}-${String(seq).padStart(4, '0')}`;
        const capa = await Capa.create({
          capa_no, title: `CAPA from Audit Finding — ${finding_type.replace(/_/g,' ').toUpperCase()}`,
          description, source_type: 'audit_finding', source_id: finding.id,
          status: 'draft', created_by: req.user.id,
        });
        await finding.update({ capa_id: capa.id, status: 'capa_raised' });
      } catch (e) { console.warn('[auditPlan.addFinding] CAPA auto-create (non-fatal):', e.message); }
    }

    res.status(201).json({ success: true, data: finding, capa_no });
  } catch (err) {
    console.error('[auditPlan.addFinding]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DELETE /audit-plans/:id ───────────────────────────────────────────────────
exports.delete = async (req, res) => {
  try {
    const plan = await AuditPlan.findByPk(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Audit plan not found' });
    if (plan.status !== 'draft') return res.status(400).json({ success: false, message: 'Only draft plans can be deleted' });
    await plan.destroy();
    res.json({ success: true, message: 'Audit plan deleted' });
  } catch (err) {
    console.error('[auditPlan.delete]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
