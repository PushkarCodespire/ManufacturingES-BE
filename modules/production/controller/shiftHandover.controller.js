const { Op } = require('sequelize');
const db = require('../../../models');

// ── GET /production/shift-handovers ───────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { status, handover_date, site_id } = req.query;
    const where = {};
    if (status)       where.status       = status;
    if (handover_date) where.handover_date = handover_date;
    if (site_id)      where.site_id      = site_id;

    const records = await db.ShiftHandover.findAll({
      where,
      include: [
        { model: db.User, as: 'outgoingSupervisor', attributes: ['id', 'name', 'employee_id'] },
        { model: db.User, as: 'incomingSupervisor', attributes: ['id', 'name', 'employee_id'] },
        { model: db.ShiftHandoverItem, as: 'items', attributes: ['id', 'item_type', 'description', 'is_checked'] },
      ],
      order: [['handover_date', 'DESC'], ['created_at', 'DESC']],
    });
    return res.json({ success: true, data: records });
  } catch (err) {
    console.error('[ShiftHandover.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /production/shift-handovers/:id ───────────────────────────────────
const getById = async (req, res) => {
  try {
    const record = await db.ShiftHandover.findByPk(req.params.id, {
      include: [
        { model: db.User, as: 'outgoingSupervisor', attributes: ['id', 'name', 'employee_id'] },
        { model: db.User, as: 'incomingSupervisor', attributes: ['id', 'name', 'employee_id'] },
        { model: db.ShiftHandoverItem, as: 'items' },
      ],
    });
    if (!record) return res.status(404).json({ success: false, message: 'Handover not found' });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[ShiftHandover.getById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /production/shift-handovers ──────────────────────────────────────
// Auto-populates items from open WOs and active breakdowns
const create = async (req, res) => {
  try {
    const {
      handover_date, shift_id, site_id,
      outgoing_supervisor_id, incoming_supervisor_id,
      production_notes, machine_notes, quality_notes, safety_notes, action_notes,
    } = req.body;

    if (!handover_date) {
      return res.status(400).json({ success: false, message: 'handover_date is required' });
    }

    const handover = await db.ShiftHandover.create({
      handover_date,
      shift_id:                shift_id                || null,
      site_id:                 site_id                 || null,
      outgoing_supervisor_id:  outgoing_supervisor_id  || req.user?.id || null,
      incoming_supervisor_id:  incoming_supervisor_id  || null,
      production_notes:        production_notes        || null,
      machine_notes:           machine_notes           || null,
      quality_notes:           quality_notes           || null,
      safety_notes:            safety_notes            || null,
      action_notes:            action_notes            || null,
      status: 'draft',
    });

    // Auto-populate items
    try {
      const itemsToCreate = [];

      // Open/in_progress WOs
      const openWOs = await db.WorkOrder.findAll({
        where: { status: { [Op.in]: ['open', 'in_progress', 'released'] } },
        include: [{ model: db.Item, as: 'Item', attributes: ['name', 'code'] }],
        attributes: ['id', 'wo_no', 'status'],
        limit: 20,
      }).catch(() => []);

      for (const wo of openWOs) {
        itemsToCreate.push({
          handover_id: handover.id,
          item_type: 'work_order',
          ref_id: wo.id,
          ref_type: 'WorkOrder',
          description: `WO ${wo.wo_no} — ${wo.Item?.name || ''} (${wo.status})`,
          is_checked: false,
        });
      }

      // Active breakdowns
      const openBreakdowns = await db.BreakdownRequest.findAll({
        where: { status: { [Op.notIn]: ['closed', 'resolved'] } },
        attributes: ['id', 'symptoms', 'status', 'created_at'],
        limit: 10,
      }).catch(() => []);

      for (const br of openBreakdowns) {
        itemsToCreate.push({
          handover_id: handover.id,
          item_type: 'breakdown',
          ref_id: br.id,
          ref_type: 'BreakdownRequest',
          description: `Breakdown: ${br.symptoms || 'No description'} (${br.status})`,
          is_checked: false,
        });
      }

      if (itemsToCreate.length > 0) {
        await db.ShiftHandoverItem.bulkCreate(itemsToCreate);
      }
    } catch (e) {
      console.warn('[ShiftHandover.create] Auto-populate non-fatal:', e.message);
    }

    // Reload with items
    const result = await db.ShiftHandover.findByPk(handover.id, {
      include: [
        { model: db.User, as: 'outgoingSupervisor', attributes: ['id', 'name'] },
        { model: db.User, as: 'incomingSupervisor', attributes: ['id', 'name'] },
        { model: db.ShiftHandoverItem, as: 'items' },
      ],
    });

    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error('[ShiftHandover.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /production/shift-handovers/:id ─────────────────────────────────
const update = async (req, res) => {
  try {
    const record = await db.ShiftHandover.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Handover not found' });

    const {
      incoming_supervisor_id,
      production_notes, machine_notes, quality_notes, safety_notes, action_notes,
    } = req.body;

    const updates = {};
    if (incoming_supervisor_id !== undefined) updates.incoming_supervisor_id = incoming_supervisor_id;
    if (production_notes       !== undefined) updates.production_notes       = production_notes;
    if (machine_notes          !== undefined) updates.machine_notes          = machine_notes;
    if (quality_notes          !== undefined) updates.quality_notes          = quality_notes;
    if (safety_notes           !== undefined) updates.safety_notes           = safety_notes;
    if (action_notes           !== undefined) updates.action_notes           = action_notes;

    await record.update(updates);
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[ShiftHandover.update]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /production/shift-handovers/:id/submit ──────────────────────────
const submit = async (req, res) => {
  try {
    const record = await db.ShiftHandover.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Handover not found' });
    if (record.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft handovers can be submitted' });
    }
    await record.update({ status: 'submitted', submitted_at: new Date() });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[ShiftHandover.submit]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /production/shift-handovers/:id/acknowledge ─────────────────────
const acknowledge = async (req, res) => {
  try {
    const record = await db.ShiftHandover.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Handover not found' });
    if (record.status !== 'submitted') {
      return res.status(400).json({ success: false, message: 'Only submitted handovers can be acknowledged' });
    }
    await record.update({
      status: 'acknowledged',
      acknowledged_at: new Date(),
      incoming_supervisor_id: req.user?.id || record.incoming_supervisor_id,
    });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[ShiftHandover.acknowledge]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /production/shift-handovers/:id/items/:itemId ──────────────────
const updateItem = async (req, res) => {
  try {
    const item = await db.ShiftHandoverItem.findOne({
      where: { id: req.params.itemId, handover_id: req.params.id },
    });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    const { is_checked, resolution_notes, description } = req.body;
    const updates = {};
    if (is_checked        !== undefined) updates.is_checked        = is_checked;
    if (resolution_notes  !== undefined) updates.resolution_notes  = resolution_notes;
    if (description       !== undefined) updates.description       = description;

    await item.update(updates);
    return res.json({ success: true, data: item });
  } catch (err) {
    console.error('[ShiftHandover.updateItem]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /production/shift-handovers/:id/items ────────────────────────────
const addItem = async (req, res) => {
  try {
    const handover = await db.ShiftHandover.findByPk(req.params.id);
    if (!handover) return res.status(404).json({ success: false, message: 'Handover not found' });

    const { item_type, description, ref_id, ref_type } = req.body;
    if (!item_type || !description) {
      return res.status(400).json({ success: false, message: 'item_type and description are required' });
    }

    const item = await db.ShiftHandoverItem.create({
      handover_id: handover.id,
      item_type: item_type || 'custom',
      description,
      ref_id: ref_id || null,
      ref_type: ref_type || null,
      is_checked: false,
    });
    return res.status(201).json({ success: true, data: item });
  } catch (err) {
    console.error('[ShiftHandover.addItem]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAll, getById, create, update, submit, acknowledge, updateItem, addItem };
