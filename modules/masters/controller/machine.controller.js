const { Op }   = require('sequelize');
const { Machine, User, ProductionParameter, MachineParameter } = require('../../../models');

const AUDIT_USER_ATTRS = ['id', 'name', 'employee_id'];

// Auto-generate code: first 3 chars + sequence
const generateCode = async (name) => {
  const prefix = name.replace(/[^A-Z0-9]/gi, '').slice(0, 3).toUpperCase() || 'MCH';
  const count  = await Machine.count();
  return `${prefix}-${String(count + 1).padStart(2, '0')}`;
};

const auditIncludes = [
  { model: User,    as: 'Creator', attributes: AUDIT_USER_ATTRS },
  { model: User,    as: 'Updater', attributes: AUDIT_USER_ATTRS },
  { model: Machine, as: 'Parent',  attributes: ['id', 'name', 'code'] },
  { model: Machine, as: 'Children', attributes: ['id', 'name', 'code'] },
  { model: ProductionParameter, as: 'Parameters', through: { attributes: ['is_production', 'is_barcode'] } },
];

// ─── GET /machines ──────────────────────────────────────────────────────────
const getAllMachines = async (req, res) => {
  try {
    const where = {};
    if (req.organizationId) where.organization_id = req.organizationId;
    // L-04: default to active-only; deactivated machines must not appear in job card machine dropdowns.
    // Pass ?is_active=false to view deactivated machines (admin/audit view).
    where.is_active = req.query.is_active !== undefined ? req.query.is_active === 'true' : true;
    if (req.query.search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${req.query.search}%` } },
        { code: { [Op.iLike]: `%${req.query.search}%` } },
      ];
    }

    const machines = await Machine.findAll({
      where,
      include: auditIncludes,
      order: [['name', 'ASC']],
    });
    return res.json({ success: true, data: machines });
  } catch (err) {
    console.error('[getAllMachines]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /machines/:id ──────────────────────────────────────────────────────
const getMachineById = async (req, res) => {
  try {
    const findWhere = { id: req.params.id };
    if (req.organizationId) findWhere.organization_id = req.organizationId;
    const machine = await Machine.findOne({ where: findWhere, include: auditIncludes });
    if (!machine) return res.status(404).json({ success: false, message: 'Machine not found' });
    return res.json({ success: true, data: machine });
  } catch (err) {
    console.error('[getMachineById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /machines ─────────────────────────────────────────────────────────
const createMachine = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Machine name is required' });
    }

    const code = await generateCode(name.trim());

    const machine = await Machine.create({
      organization_id:    req.organizationId || null,
      name:               name.trim(),
      code,
      parent_id:          req.body.parent_id   || null,
      description:        req.body.description || null,
      production_against: req.body.production_against || 'none',
      is_active:          true,
      created_by:         req.user?.id || null,
      updated_by:         req.user?.id || null,
    });

    // Assign parameters if provided
    if (Array.isArray(req.body.parameter_ids)) {
      for (const pid of req.body.parameter_ids) {
        await MachineParameter.create({
          machine_id:    machine.id,
          parameter_id:  pid,
          is_production: false,
          is_barcode:    false,
        });
      }
    }

    const full = await Machine.findByPk(machine.id, { include: auditIncludes });

    return res.status(201).json({
      success: true,
      message: `Machine "${machine.name}" created successfully`,
      data:    full,
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'A machine with this code already exists' });
    }
    console.error('[createMachine]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /machines/bulk ────────────────────────────────────────────────────
// Stepper-based creation: creates machines with hierarchy, production type & parameters
const bulkCreateMachines = async (req, res) => {
  try {
    const { machines: machineList } = req.body;
    if (!Array.isArray(machineList) || machineList.length === 0) {
      return res.status(400).json({ success: false, message: 'Machines array is required' });
    }

    const created = [];

    // Recursive function to create machine and its children
    const createWithChildren = async (item, parentId = null) => {
      if (!item.name?.trim()) return;

      const code = await generateCode(item.name.trim());
      const machine = await Machine.create({
        organization_id:    req.organizationId || null,
        name:               item.name.trim(),
        code,
        parent_id:          parentId,
        description:        item.description || null,
        production_against: item.production_against || 'none',
        shift:              item.shift || null,
        setup_time_hrs:     item.setup_time_hrs ?? null,
        queue_time_days:    item.queue_time_days ?? null,
        min_batch_quantity: item.min_batch_quantity ?? null,
        item_group_tags:    Array.isArray(item.item_group_tags)    ? item.item_group_tags    : [],
        machine_group_tags: Array.isArray(item.machine_group_tags) ? item.machine_group_tags : [],
        iot_device_tags:    Array.isArray(item.iot_device_tags)    ? item.iot_device_tags    : [],
        weighted_production: item.weighted_production ?? false,
        auto_production:     item.auto_production ?? false,
        start_stop_flow:     item.start_stop_flow ?? false,
        serialization:       item.serialization ?? false,
        is_active:          true,
        created_by:         req.user?.id || null,
        updated_by:         req.user?.id || null,
      });

      // Assign parameters by ID
      const paramIds = new Set();
      if (Array.isArray(item.parameter_ids)) {
        item.parameter_ids.forEach((pid) => paramIds.add(pid));
      }
      // Also resolve parameter_names to IDs (for hardcoded column names)
      if (Array.isArray(item.parameter_names)) {
        for (const pName of item.parameter_names) {
          const found = await ProductionParameter.findOne({ where: { name: pName, is_active: true } });
          if (found) paramIds.add(found.id);
        }
      }
      for (const pid of paramIds) {
        await MachineParameter.create({
          machine_id:    machine.id,
          parameter_id:  pid,
          is_production: false,
          is_barcode:    false,
        });
      }

      created.push(machine);

      // Create children recursively
      if (Array.isArray(item.children)) {
        for (const child of item.children) {
          await createWithChildren(child, machine.id);
        }
      }
    };

    for (const item of machineList) {
      await createWithChildren(item, item.parent_id || null);
    }

    // Fetch all created machines with full includes
    const ids = created.map((m) => m.id);
    const full = await Machine.findAll({
      where: { id: { [Op.in]: ids } },
      include: auditIncludes,
    });

    return res.status(201).json({
      success: true,
      message: `${created.length} machine(s) created successfully`,
      data:    full,
    });
  } catch (err) {
    console.error('[bulkCreateMachines]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PATCH /machines/:id ────────────────────────────────────────────────────
const updateMachine = async (req, res) => {
  try {
    const findWhere = { id: req.params.id };
    if (req.organizationId) findWhere.organization_id = req.organizationId;
    const machine = await Machine.findOne({ where: findWhere });
    if (!machine) return res.status(404).json({ success: false, message: 'Machine not found' });

    const { id, code, createdAt, updatedAt, created_by, parameter_ids, ...updateData } = req.body;
    updateData.updated_by = req.user?.id || null;

    // Coerce empty strings to null for numeric fields so Postgres doesn't reject them
    const numericFields = ['setup_time_hrs', 'queue_time_days', 'min_batch_quantity', 'shift'];
    for (const f of numericFields) {
      if (updateData[f] === '') updateData[f] = null;
    }

    await machine.update(updateData);

    // Update parameter assignments if provided
    if (Array.isArray(parameter_ids)) {
      await MachineParameter.destroy({ where: { machine_id: machine.id } });
      for (const pid of parameter_ids) {
        await MachineParameter.create({
          machine_id:    machine.id,
          parameter_id:  pid,
          is_production: false,
          is_barcode:    false,
        });
      }
    }

    const full = await Machine.findByPk(machine.id, { include: auditIncludes });

    return res.json({ success: true, message: 'Machine updated successfully', data: full });
  } catch (err) {
    console.error('[updateMachine]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PATCH /machines/:id/parameters ─────────────────────────────────────────
const updateMachineParameters = async (req, res) => {
  try {
    const findWhere = { id: req.params.id };
    if (req.organizationId) findWhere.organization_id = req.organizationId;
    const machine = await Machine.findOne({ where: findWhere });
    if (!machine) return res.status(404).json({ success: false, message: 'Machine not found' });

    const { parameters } = req.body; // [{ parameter_id, is_production, is_barcode }]
    if (!Array.isArray(parameters)) {
      return res.status(400).json({ success: false, message: 'Parameters array required' });
    }

    // Validate each entry has a parameter_id
    const invalid = parameters.filter((p) => !p.parameter_id);
    if (invalid.length) {
      return res.status(400).json({ success: false, message: 'Each parameter entry must include a parameter_id (integer FK to production_parameters)' });
    }

    await MachineParameter.destroy({ where: { machine_id: machine.id } });
    for (const p of parameters) {
      await MachineParameter.create({
        machine_id:    machine.id,
        parameter_id:  p.parameter_id,
        is_production: p.is_production ?? false,
        is_barcode:    p.is_barcode ?? false,
      });
    }

    const full = await Machine.findByPk(machine.id, { include: auditIncludes });
    return res.json({ success: true, data: full });
  } catch (err) {
    console.error('[updateMachineParameters]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── DELETE /machines/:id ───────────────────────────────────────────────────
// L-04: Soft-delete — set is_active=false rather than hard-deleting.
// Machines are referenced by work orders, job cards, downtime logs, and LOTO records.
// A hard delete would destroy that operational history or fail with FK errors.
// Deactivated machines are hidden from job card / work order machine selectors.
const deleteMachine = async (req, res) => {
  try {
    const findWhere = { id: req.params.id };
    if (req.organizationId) findWhere.organization_id = req.organizationId;
    const machine = await Machine.findOne({ where: findWhere });
    if (!machine) return res.status(404).json({ success: false, message: 'Machine not found' });
    if (!machine.is_active) {
      return res.status(400).json({ success: false, message: `Machine "${machine.name}" is already deactivated` });
    }

    await machine.update({ is_active: false, updated_by: req.user?.id || null });
    return res.json({ success: true, message: `Machine "${machine.name}" deactivated successfully` });
  } catch (err) {
    console.error('[deleteMachine]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAllMachines,
  getMachineById,
  createMachine,
  bulkCreateMachines,
  updateMachine,
  updateMachineParameters,
  deleteMachine,
};
