const { Op } = require('sequelize');
const { PpapSubmission, PpapElement, Item, User } = require('../../../models');
const { generateAutoNumber } = require('../../../utils/autoNumber');

// Standard 18 PPAP elements (AIAG)
const STANDARD_ELEMENTS = [
  { element_no: 1,  element_name: 'Design Records' },
  { element_no: 2,  element_name: 'Engineering Change Documents' },
  { element_no: 3,  element_name: 'Customer Engineering Approval' },
  { element_no: 4,  element_name: 'Design Failure Mode & Effects Analysis (DFMEA)' },
  { element_no: 5,  element_name: 'Process Flow Diagram' },
  { element_no: 6,  element_name: 'Process FMEA (PFMEA)' },
  { element_no: 7,  element_name: 'Control Plan' },
  { element_no: 8,  element_name: 'Measurement System Analysis (MSA/Gauge R&R)' },
  { element_no: 9,  element_name: 'Dimensional Results' },
  { element_no: 10, element_name: 'Material / Performance Test Results' },
  { element_no: 11, element_name: 'Initial Process Studies (Cpk)' },
  { element_no: 12, element_name: 'Qualified Laboratory Documentation' },
  { element_no: 13, element_name: 'Appearance Approval Report (AAR)' },
  { element_no: 14, element_name: 'Sample Production Parts' },
  { element_no: 15, element_name: 'Master Sample' },
  { element_no: 16, element_name: 'Checking Aids' },
  { element_no: 17, element_name: 'Customer-Specific Requirements' },
  { element_no: 18, element_name: 'Part Submission Warrant (PSW)' },
];

// Level 1: 18 only; Level 2: 9,10,11,18; Level 3: all; Level 4: customer-defined; Level 5: all on-site
const REQUIRED_BY_LEVEL = {
  1: [18],
  2: [9, 10, 11, 18],
  3: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
  4: [1,2,5,6,7,9,10,11,18],
  5: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
};

const nextPpapNo = () => generateAutoNumber(PpapSubmission, 'ppap_no', 'PPAP');

const INCLUDES = [
  { model: Item, as: 'Item', attributes: ['id', 'name', 'code'] },
  { model: User, as: 'Creator', attributes: ['id', 'name'], required: false },
  { model: User, as: 'PswSignedBy', attributes: ['id', 'name'], required: false },
  {
    model: PpapElement, as: 'Elements',
    include: [{ model: User, as: 'CompletedBy', attributes: ['id', 'name'], required: false }],
    order: [['element_no', 'ASC']],
  },
];

// ── GET /ppap ─────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { item_id, status, search } = req.query;
    const where = {};
    if (item_id) where.item_id = item_id;
    if (status)  where.status  = status;
    if (search)  where.ppap_no = { [Op.iLike]: `%${search}%` };

    const data = await PpapSubmission.findAll({
      where,
      include: [
        { model: Item, as: 'Item', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'Creator', attributes: ['id', 'name'], required: false },
        { model: PpapElement, as: 'Elements', attributes: ['element_no', 'status', 'required'] },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[ppap.getAll]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /ppap/:id ─────────────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const row = await PpapSubmission.findByPk(req.params.id, { include: INCLUDES });
    if (!row) return res.status(404).json({ success: false, message: 'PPAP not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('[ppap.getById]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /ppap ────────────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { item_id, submission_level = 3, revision, customer_id, notes } = req.body;
    if (!item_id) return res.status(400).json({ success: false, message: 'item_id is required' });

    const ppap_no = await nextPpapNo();
    const level   = parseInt(submission_level, 10);
    const required = REQUIRED_BY_LEVEL[level] || REQUIRED_BY_LEVEL[3];

    const submission = await PpapSubmission.create({
      ppap_no, item_id, customer_id: customer_id || null,
      submission_level: level, revision: revision || 'A',
      notes, status: 'draft', created_by: req.user.id, updated_by: req.user.id,
    });

    // Auto-create all 18 elements, marking required ones based on level
    await PpapElement.bulkCreate(
      STANDARD_ELEMENTS.map((el) => ({
        ppap_id:      submission.id,
        element_no:   el.element_no,
        element_name: el.element_name,
        required:     required.includes(el.element_no),
        status:       required.includes(el.element_no) ? 'not_started' : 'na',
      }))
    );

    const full = await PpapSubmission.findByPk(submission.id, { include: INCLUDES });
    res.status(201).json({ success: true, data: full });
  } catch (err) {
    console.error('[ppap.create]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /ppap/:id/element/:elementId ───────────────────────────────────────
exports.updateElement = async (req, res) => {
  try {
    const element = await PpapElement.findOne({
      where: { id: req.params.elementId, ppap_id: req.params.id },
    });
    if (!element) return res.status(404).json({ success: false, message: 'Element not found' });

    const updates = {};
    if (req.body.status)       updates.status       = req.body.status;
    if (req.body.document_url) updates.document_url = req.body.document_url;
    if (req.body.notes)        updates.notes        = req.body.notes;
    if (req.body.status === 'complete') {
      updates.completed_by = req.user.id;
      updates.completed_at = new Date();
    }

    await element.update(updates);

    // Recalculate submission status
    const submission = await PpapSubmission.findByPk(req.params.id, {
      include: [{ model: PpapElement, as: 'Elements' }],
    });
    const required = submission.Elements.filter((e) => e.required);
    const allDone  = required.every((e) => e.status === 'complete');
    const anyStarted = required.some((e) => e.status !== 'not_started');
    if (submission.status === 'draft' && anyStarted) await submission.update({ status: 'in_progress' });
    if (allDone && submission.status !== 'submitted') await submission.update({ status: 'in_progress', updated_by: req.user.id });

    res.json({ success: true, data: element });
  } catch (err) {
    console.error('[ppap.updateElement]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /ppap/:id/sign-psw ──────────────────────────────────────────────────
exports.signPsw = async (req, res) => {
  try {
    const row = await PpapSubmission.findByPk(req.params.id, {
      include: [{ model: PpapElement, as: 'Elements' }],
    });
    if (!row) return res.status(404).json({ success: false, message: 'PPAP not found' });

    const required = row.Elements.filter((e) => e.required);
    const incomplete = required.filter((e) => e.status !== 'complete');
    if (incomplete.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${incomplete.length} required elements are not complete yet`,
        incomplete: incomplete.map((e) => `Element ${e.element_no}: ${e.element_name}`),
      });
    }

    await row.update({
      status: 'submitted', psw_signed_by: req.user.id, psw_signed_at: new Date(), updated_by: req.user.id,
    });
    res.json({ success: true, data: row, message: `PSW signed — PPAP ${row.ppap_no} submitted` });
  } catch (err) {
    console.error('[ppap.signPsw]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /ppap/:id/approve ────────────────────────────────────────────────────
exports.approve = async (req, res) => {
  try {
    const row = await PpapSubmission.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'PPAP not found' });
    if (row.status !== 'submitted') return res.status(400).json({ success: false, message: 'Only submitted PPAPs can be approved' });
    await row.update({ status: 'approved', customer_approved_at: new Date(), updated_by: req.user.id });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('[ppap.approve]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /ppap/:id/reject ─────────────────────────────────────────────────────
exports.reject = async (req, res) => {
  try {
    const row = await PpapSubmission.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'PPAP not found' });
    await row.update({ status: 'rejected', notes: req.body.notes || row.notes, updated_by: req.user.id });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('[ppap.reject]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DELETE /ppap/:id ───────────────────────────────────────────────────────────
exports.delete = async (req, res) => {
  try {
    const row = await PpapSubmission.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'PPAP not found' });
    if (!['draft', 'rejected'].includes(row.status)) {
      return res.status(400).json({ success: false, message: 'Only draft/rejected PPAPs can be deleted' });
    }
    await row.destroy();
    res.json({ success: true, message: 'PPAP deleted' });
  } catch (err) {
    console.error('[ppap.delete]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
