const { Op } = require('sequelize');
const {
  Mold, MoldCategory, MoldStorageLocation, MoldShotSummary, WorkOrder,
  MoldPartMapping, Item, sequelize,
} = require('../../../models');

// ── GET /molds/store/dashboard ──────────────────────────────────────────────
const getDashboard = async (req, res) => {
  try {
    // Count molds by status
    const statusCounts = await Mold.findAll({
      where: { is_active: true },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['status'],
      raw: true,
    });

    const summary = {
      in_production:  0,
      in_storage:     0,
      repair_needed:  0,
      in_repair:      0,
      end_of_life:    0,
      total:          0,
    };
    for (const row of statusCounts) {
      if (summary.hasOwnProperty(row.status)) {
        summary[row.status] = parseInt(row.count, 10);
      }
      summary.total += parseInt(row.count, 10);
    }

    // List all active molds
    const molds = await Mold.findAll({
      where: { is_active: true },
      include: [
        { model: MoldCategory,        as: 'Category' },
        { model: MoldStorageLocation, as: 'StorageLocation' },
        { model: MoldShotSummary,     as: 'ShotSummary' },
      ],
      order: [['status', 'ASC'], ['created_at', 'DESC']],
    });

    return res.json({ success: true, data: { summary, molds } });
  } catch (err) {
    console.error('[MoldStore.getDashboard]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /molds/store/rack-map ───────────────────────────────────────────────
const getRackMap = async (req, res) => {
  try {
    const locations = await MoldStorageLocation.findAll({
      include: [
        {
          model: Mold,
          as: 'CurrentMold',
          attributes: ['id', 'mold_code', 'name', 'status', 'weight_kg'],
        },
      ],
      order: [['rack_number', 'ASC'], ['shelf_number', 'ASC'], ['position_number', 'ASC']],
    });

    return res.json({ success: true, data: locations });
  } catch (err) {
    console.error('[MoldStore.getRackMap]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /molds/store/movement-forecast ──────────────────────────────────────
const getMovementForecast = async (req, res) => {
  try {
    const movements = [];
    const today    = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const sevenDaysOut = new Date();
    sevenDaysOut.setDate(today.getDate() + 7);

    // ── 1. Molds currently in production (expected returns) ─────────────────
    const inProduction = await Mold.findAll({
      where: { is_active: true, status: 'in_production' },
      attributes: ['id', 'mold_code', 'name', 'status'],
      order: [['updated_at', 'DESC']],
    });
    for (const mold of inProduction) {
      movements.push({
        movement_type: 'return',
        mold_id:       mold.id,
        mold_code:     mold.mold_code,
        mold_name:     mold.name,
        date:          todayStr,
        work_order:    null,
        machine:       null,
      });
    }

    // ── 2. Upcoming WOs that need molds (issue forecast) ────────────────────
    const upcomingWOs = await WorkOrder.findAll({
      where: {
        status: { [Op.in]: ['draft', 'open'] },
        planned_start: { [Op.lte]: sevenDaysOut, [Op.gte]: today },
      },
      attributes: ['id', 'wo_no', 'item_id', 'planned_start'],
      order: [['planned_start', 'ASC']],
    });

    for (const wo of upcomingWOs) {
      if (!wo.item_id) continue;
      const mapping = await MoldPartMapping.findOne({
        where: { item_id: wo.item_id, is_primary: true },
      });
      if (!mapping) continue;
      const mold = await Mold.findByPk(mapping.mold_id, {
        attributes: ['id', 'mold_code', 'name', 'status'],
      });
      if (!mold) continue;
      movements.push({
        movement_type: 'issue',
        mold_id:       mold.id,
        mold_code:     mold.mold_code,
        mold_name:     mold.name,
        date:          wo.planned_start ? new Date(wo.planned_start).toISOString().slice(0, 10) : todayStr,
        work_order:    wo.wo_no,
        machine:       null,
      });
    }

    // Sort by date ascending
    movements.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    return res.json({ success: true, data: movements });
  } catch (err) {
    console.error('[MoldStore.getMovementForecast]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /molds/:moldId/store/location ─────────────────────────────────────
const updateLocation = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { storage_location_id } = req.body;
    if (!storage_location_id) {
      return res.status(400).json({ success: false, message: 'storage_location_id is required' });
    }

    const mold = await Mold.findByPk(req.params.moldId, { transaction: t });
    if (!mold) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Mold not found' });
    }

    const newLocation = await MoldStorageLocation.findByPk(storage_location_id, { transaction: t });
    if (!newLocation) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Storage location not found' });
    }

    // Free old location if exists
    if (mold.storage_location_id) {
      await MoldStorageLocation.update(
        { status: 'available', current_mold_id: null, updated_by: req.user.id },
        { where: { id: mold.storage_location_id }, transaction: t }
      );
    }

    // Update new location
    await newLocation.update(
      { status: 'occupied', current_mold_id: mold.id, updated_by: req.user.id },
      { transaction: t }
    );

    // Update mold
    await mold.update(
      { storage_location_id, updated_by: req.user.id },
      { transaction: t }
    );

    await t.commit();
    return res.json({ success: true, data: mold });
  } catch (err) {
    await t.rollback();
    console.error('[MoldStore.updateLocation]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /molds/store/locations ─────────────────────────────────────────────
const createStorageLocation = async (req, res) => {
  try {
    const { rack_number, shelf_number, position_number, capacity_kg } = req.body;
    if (!rack_number || shelf_number == null || position_number == null) {
      return res.status(400).json({ success: false, message: 'rack_number, shelf_number, and position_number are required' });
    }

    const existing = await MoldStorageLocation.findOne({
      where: { rack_number: String(rack_number), shelf_number: String(shelf_number), position_number: String(position_number) },
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A location with this rack/shelf/position already exists' });
    }

    const location = await MoldStorageLocation.create({
      rack_number:     String(rack_number),
      shelf_number:    String(shelf_number),
      position_number: String(position_number),
      capacity_kg:     capacity_kg ?? null,
      status:          'available',
      created_by:      req.user.id,
      updated_by:      req.user.id,
    });

    return res.status(201).json({ success: true, data: location });
  } catch (err) {
    console.error('[MoldStore.createStorageLocation]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /molds/store/locations/:locationId ────────────────────────────────
const updateStorageLocation = async (req, res) => {
  try {
    const location = await MoldStorageLocation.findByPk(req.params.locationId);
    if (!location) return res.status(404).json({ success: false, message: 'Location not found' });

    const { rack_number, shelf_number, position_number, capacity_kg } = req.body;

    // Check uniqueness if coordinates are being changed
    if (rack_number != null || shelf_number != null || position_number != null) {
      const newRack  = rack_number      != null ? String(rack_number)      : location.rack_number;
      const newShelf = shelf_number     != null ? String(shelf_number)     : location.shelf_number;
      const newPos   = position_number  != null ? String(position_number)  : location.position_number;
      const conflict = await MoldStorageLocation.findOne({
        where: { rack_number: newRack, shelf_number: newShelf, position_number: newPos },
      });
      if (conflict && conflict.id !== location.id) {
        return res.status(409).json({ success: false, message: 'A location with this rack/shelf/position already exists' });
      }
    }

    await location.update({
      ...(rack_number      != null && { rack_number:     String(rack_number) }),
      ...(shelf_number     != null && { shelf_number:    String(shelf_number) }),
      ...(position_number  != null && { position_number: String(position_number) }),
      ...(capacity_kg      !== undefined && { capacity_kg }),
      updated_by: req.user.id,
    });

    return res.json({ success: true, data: location });
  } catch (err) {
    console.error('[MoldStore.updateStorageLocation]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DELETE /molds/store/locations/:locationId ────────────────────────────────
const deleteStorageLocation = async (req, res) => {
  try {
    const location = await MoldStorageLocation.findByPk(req.params.locationId);
    if (!location) return res.status(404).json({ success: false, message: 'Location not found' });

    if (location.status === 'occupied') {
      return res.status(400).json({ success: false, message: 'Cannot delete an occupied location — move the mold first' });
    }

    await location.destroy();
    return res.json({ success: true, message: 'Location deleted' });
  } catch (err) {
    console.error('[MoldStore.deleteStorageLocation]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getDashboard, getRackMap, getMovementForecast, updateLocation, createStorageLocation, updateStorageLocation, deleteStorageLocation };
