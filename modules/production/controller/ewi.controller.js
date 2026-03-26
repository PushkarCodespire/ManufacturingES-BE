const { Op } = require('sequelize');
const db = () => require('../../../models');

/* ── Auto-number ────────────────────────────────────────────────────────── */
async function nextDocNo() {
  const year   = new Date().getFullYear();
  const prefix = `EWI-${year}-`;
  const last   = await db().EwiDocument.findOne({
    where:      { doc_no: { [Op.like]: `${prefix}%` } },
    order:      [['doc_no', 'DESC']],
    attributes: ['doc_no'],
  });
  const seq = last ? parseInt(last.doc_no.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

/* ── LIST ────────────────────────────────────────────────────────────────── */
exports.getAll = async (req, res) => {
  try {
    const { status, item_id, q, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status)  where.status  = status;
    if (item_id) where.item_id = item_id;
    if (q)       where[Op.or]  = [
      { doc_no: { [Op.iLike]: `%${q}%` } },
      { title:  { [Op.iLike]: `%${q}%` } },
    ];

    const { count, rows } = await db().EwiDocument.findAndCountAll({
      where,
      include: [
        { model: db().Item,        as: 'Item',        attributes: ['id', 'code', 'name'], required: false },
        { model: db().RoutingStep, as: 'RoutingStep', attributes: ['id', 'step_no', 'operation_name'], required: false },
        { model: db().User,        as: 'Creator',     attributes: ['id', 'name'], required: false },
      ],
      order:  [['createdAt', 'DESC']],
      limit:  parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    res.json({ total: count, data: rows });
  } catch (err) {
    console.error('[ewi.getAll]', err);
    res.status(500).json({ message: err.message });
  }
};

/* ── GET BY ID ───────────────────────────────────────────────────────────── */
exports.getById = async (req, res) => {
  try {
    const doc = await db().EwiDocument.findByPk(req.params.id, {
      include: [
        { model: db().Item,        as: 'Item',        attributes: ['id', 'code', 'name'], required: false },
        { model: db().Routing,     as: 'Routing',     attributes: ['id', 'code', 'name'], required: false },
        { model: db().RoutingStep, as: 'RoutingStep', attributes: ['id', 'step_no', 'operation_name'], required: false },
        { model: db().User,        as: 'ApprovedBy',  attributes: ['id', 'name'], required: false },
        { model: db().User,        as: 'Creator',     attributes: ['id', 'name'], required: false },
        { model: db().EwiStep,     as: 'Steps' },
      ],
    });
    if (!doc) return res.status(404).json({ message: 'EWI not found' });
    // Sort steps
    if (doc.Steps) doc.Steps.sort((a, b) => a.step_no - b.step_no);
    res.json(doc);
  } catch (err) {
    console.error('[ewi.getById]', err);
    res.status(500).json({ message: err.message });
  }
};

/* ── CREATE ──────────────────────────────────────────────────────────────── */
exports.create = async (req, res) => {
  try {
    const { title, item_id, routing_id, routing_step_id, version, effective_date, notes } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const doc_no = await nextDocNo();
    const doc = await db().EwiDocument.create({
      doc_no,
      title,
      item_id:         item_id         || null,
      routing_id:      routing_id      || null,
      routing_step_id: routing_step_id || null,
      version:         version         || '1.0',
      effective_date:  effective_date  || null,
      notes:           notes           || null,
      created_by: req.user.id,
      updated_by: req.user.id,
    });
    res.status(201).json(doc);
  } catch (err) {
    console.error('[ewi.create]', err);
    res.status(500).json({ message: err.message });
  }
};

/* ── UPDATE ──────────────────────────────────────────────────────────────── */
exports.update = async (req, res) => {
  try {
    const doc = await db().EwiDocument.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ message: 'EWI not found' });
    if (doc.status === 'obsolete') return res.status(400).json({ message: 'Cannot edit an obsolete EWI' });

    const { title, item_id, routing_id, routing_step_id, version, effective_date, notes, revision_notes } = req.body;
    await doc.update({
      title:           title           ?? doc.title,
      item_id:         item_id         ?? doc.item_id,
      routing_id:      routing_id      ?? doc.routing_id,
      routing_step_id: routing_step_id ?? doc.routing_step_id,
      version:         version         ?? doc.version,
      effective_date:  effective_date  ?? doc.effective_date,
      notes:           notes           ?? doc.notes,
      revision_notes:  revision_notes  ?? doc.revision_notes,
      updated_by:      req.user.id,
    });
    res.json(doc);
  } catch (err) {
    console.error('[ewi.update]', err);
    res.status(500).json({ message: err.message });
  }
};

/* ── UPDATE STATUS ───────────────────────────────────────────────────────── */
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['draft', 'active', 'obsolete'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const doc = await db().EwiDocument.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ message: 'EWI not found' });

    const updates = { status, updated_by: req.user.id };
    if (status === 'active') {
      // Only one active EWI per item+routing_step allowed — obsolete others
      if (doc.item_id) {
        await db().EwiDocument.update(
          { status: 'obsolete' },
          { where: { item_id: doc.item_id, routing_step_id: doc.routing_step_id, status: 'active', id: { [Op.ne]: doc.id } } }
        );
      }
      updates.approved_by = req.user.id;
      updates.approved_at = new Date();
    }
    await doc.update(updates);
    res.json(doc);
  } catch (err) {
    console.error('[ewi.updateStatus]', err);
    res.status(500).json({ message: err.message });
  }
};

/* ── ADD STEP ────────────────────────────────────────────────────────────── */
exports.addStep = async (req, res) => {
  try {
    const doc = await db().EwiDocument.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ message: 'EWI not found' });

    const { title, step_no, instruction, warning, image_url, parameters } = req.body;
    if (!title) return res.status(400).json({ message: 'Step title is required' });

    // Auto step_no if not provided
    let nextStep = step_no;
    if (!nextStep) {
      const last = await db().EwiStep.findOne({ where: { ewi_id: doc.id }, order: [['step_no', 'DESC']] });
      nextStep = last ? last.step_no + 10 : 10;
    }

    const step = await db().EwiStep.create({
      ewi_id:      doc.id,
      step_no:     nextStep,
      title,
      instruction: instruction || null,
      warning:     warning     || null,
      image_url:   image_url   || null,
      parameters:  parameters  || [],
      created_by:  req.user.id,
    });
    res.status(201).json(step);
  } catch (err) {
    console.error('[ewi.addStep]', err);
    res.status(500).json({ message: err.message });
  }
};

/* ── UPDATE STEP ─────────────────────────────────────────────────────────── */
exports.updateStep = async (req, res) => {
  try {
    const step = await db().EwiStep.findOne({ where: { id: req.params.stepId, ewi_id: req.params.id } });
    if (!step) return res.status(404).json({ message: 'Step not found' });

    const { title, step_no, instruction, warning, image_url, parameters } = req.body;
    await step.update({
      title:       title       ?? step.title,
      step_no:     step_no     ?? step.step_no,
      instruction: instruction ?? step.instruction,
      warning:     warning     ?? step.warning,
      image_url:   image_url   ?? step.image_url,
      parameters:  parameters  ?? step.parameters,
    });
    res.json(step);
  } catch (err) {
    console.error('[ewi.updateStep]', err);
    res.status(500).json({ message: err.message });
  }
};

/* ── DELETE STEP ─────────────────────────────────────────────────────────── */
exports.deleteStep = async (req, res) => {
  try {
    const step = await db().EwiStep.findOne({ where: { id: req.params.stepId, ewi_id: req.params.id } });
    if (!step) return res.status(404).json({ message: 'Step not found' });
    await step.destroy();
    res.json({ message: 'Step deleted' });
  } catch (err) {
    console.error('[ewi.deleteStep]', err);
    res.status(500).json({ message: err.message });
  }
};

/* ── GET FOR JOB CARD ────────────────────────────────────────────────────── */
exports.getForJob = async (req, res) => {
  try {
    const jc = await db().JobCard.findByPk(req.params.jobCardId, {
      attributes: ['id', 'work_order_id', 'routing_step_id'],
      include: [{ model: db().WorkOrder, as: 'WorkOrder', attributes: ['item_id'] }],
    });
    if (!jc) return res.status(404).json({ message: 'Job card not found' });

    const itemId        = jc.WorkOrder?.item_id;
    const routingStepId = jc.routing_step_id;

    const where = { status: 'active' };
    if (itemId)        where.item_id         = itemId;
    if (routingStepId) where.routing_step_id = routingStepId;

    let doc = null;
    if (itemId || routingStepId) {
      // Try exact match first (item + step), then item only
      doc = await db().EwiDocument.findOne({
        where: { ...where, ...(routingStepId ? { routing_step_id: routingStepId } : {}) },
        include: [{ model: db().EwiStep, as: 'Steps' }],
        order: [['updatedAt', 'DESC']],
      });
      if (!doc && itemId) {
        doc = await db().EwiDocument.findOne({
          where: { status: 'active', item_id: itemId },
          include: [{ model: db().EwiStep, as: 'Steps' }],
          order: [['updatedAt', 'DESC']],
        });
      }
    }

    if (!doc) return res.json(null);
    if (doc.Steps) doc.Steps.sort((a, b) => a.step_no - b.step_no);

    // Check if already acknowledged for this job card
    const ack = await db().EwiAcknowledgment.findOne({
      where: { ewi_id: doc.id, job_card_id: jc.id },
    });

    res.json({ ...doc.toJSON(), already_acknowledged: !!ack });
  } catch (err) {
    console.error('[ewi.getForJob]', err);
    res.status(500).json({ message: err.message });
  }
};

/* ── ACKNOWLEDGE ─────────────────────────────────────────────────────────── */
exports.acknowledge = async (req, res) => {
  try {
    const doc = await db().EwiDocument.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ message: 'EWI not found' });

    const { job_card_id, work_order_id } = req.body;

    // Idempotent — skip if already acknowledged for this job
    const existing = job_card_id
      ? await db().EwiAcknowledgment.findOne({ where: { ewi_id: doc.id, job_card_id } })
      : null;

    if (existing) return res.json(existing);

    const ack = await db().EwiAcknowledgment.create({
      ewi_id:          doc.id,
      ewi_version:     doc.version,
      job_card_id:     job_card_id   || null,
      work_order_id:   work_order_id || null,
      acknowledged_by: req.user.id,
      acknowledged_at: new Date(),
    });
    res.status(201).json(ack);
  } catch (err) {
    console.error('[ewi.acknowledge]', err);
    res.status(500).json({ message: err.message });
  }
};
