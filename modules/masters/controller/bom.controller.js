const { Op }   = require('sequelize');
const { Bom, BomLine, Item, User } = require('../../../models');

const AUDIT_USER_ATTRS = ['id', 'name', 'employee_id'];

const bomIncludes = [
  { model: Item,    as: 'Item',      attributes: ['id', 'name', 'code', 'item_type', 'unit', 'bom_unit'] },
  { model: User,    as: 'Creator',   attributes: AUDIT_USER_ATTRS },
  { model: User,    as: 'Updater',   attributes: AUDIT_USER_ATTRS },
  { model: User,    as: 'Finalizer', attributes: AUDIT_USER_ATTRS },
  {
    model: BomLine,
    as: 'Lines',
    include: [
      { model: Item, as: 'Component', attributes: ['id', 'name', 'code', 'item_type', 'unit'] },
    ],
    order: [['sort_order', 'ASC']],
  },
];

// ─── GET /boms ──────────────────────────────────────────────────────────────
const getAllBoms = async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;

    const boms = await Bom.findAll({
      where,
      include: bomIncludes,
      order: [['createdAt', 'DESC']],
    });
    return res.json({ success: true, data: boms });
  } catch (err) {
    console.error('[getAllBoms]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /boms/item/:itemId ─────────────────────────────────────────────────
const getBomByItemId = async (req, res) => {
  try {
    const bom = await Bom.findOne({
      where: { item_id: req.params.itemId },
      include: bomIncludes,
    });
    if (!bom) return res.json({ success: true, data: null });
    return res.json({ success: true, data: bom });
  } catch (err) {
    console.error('[getBomByItemId]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /boms ─────────────────────────────────────────────────────────────
// Creates or updates a draft BOM for an item.
const createOrUpdateBom = async (req, res) => {
  try {
    const { item_id, bom_unit, lines } = req.body;
    if (!item_id) {
      return res.status(400).json({ success: false, message: 'item_id is required' });
    }

    // Check the parent item exists
    const item = await Item.findByPk(item_id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    // Check if BOM already exists
    let bom = await Bom.findOne({ where: { item_id } });

    if (bom && bom.status === 'finalized') {
      return res.status(400).json({ success: false, message: 'BOM is already finalized and cannot be edited' });
    }

    if (bom) {
      // Update existing draft
      await bom.update({
        bom_unit:   bom_unit || bom.bom_unit,
        updated_by: req.user?.id || null,
      });
      // Replace lines
      await BomLine.destroy({ where: { bom_id: bom.id } });
    } else {
      // Create new BOM
      bom = await Bom.create({
        item_id,
        bom_unit:   bom_unit || null,
        status:     'draft',
        created_by: req.user?.id || null,
        updated_by: req.user?.id || null,
      });
    }

    // Create lines
    if (Array.isArray(lines)) {
      for (let i = 0; i < lines.length; i++) {
        const ln = lines[i];
        if (!ln.component_item_id || !ln.quantity) continue;
        await BomLine.create({
          bom_id:            bom.id,
          component_item_id: ln.component_item_id,
          quantity:          ln.quantity,
          unit:              ln.unit || null,
          sort_order:        i,
        });
      }
    }

    // Reload with includes
    const full = await Bom.findByPk(bom.id, { include: bomIncludes });

    return res.status(201).json({
      success: true,
      message: 'BOM saved successfully',
      data:    full,
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'Duplicate component in BOM' });
    }
    console.error('[createOrUpdateBom]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /boms/:id/finalize ────────────────────────────────────────────────
const finalizeBom = async (req, res) => {
  try {
    const bom = await Bom.findByPk(req.params.id);
    if (!bom) return res.status(404).json({ success: false, message: 'BOM not found' });

    if (bom.status === 'finalized') {
      return res.status(400).json({ success: false, message: 'BOM is already finalized' });
    }

    // Ensure BOM has at least one line
    const lineCount = await BomLine.count({ where: { bom_id: bom.id } });
    if (lineCount === 0) {
      return res.status(400).json({ success: false, message: 'Cannot finalize a BOM with no components' });
    }

    await bom.update({
      status:       'finalized',
      finalized_at: new Date(),
      finalized_by: req.user?.id || null,
      updated_by:   req.user?.id || null,
    });

    const full = await Bom.findByPk(bom.id, { include: bomIncludes });
    return res.json({ success: true, message: 'BOM finalized successfully', data: full });
  } catch (err) {
    console.error('[finalizeBom]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── DELETE /boms/:id ───────────────────────────────────────────────────────
const deleteBom = async (req, res) => {
  try {
    const bom = await Bom.findByPk(req.params.id);
    if (!bom) return res.status(404).json({ success: false, message: 'BOM not found' });

    if (bom.status === 'finalized') {
      return res.status(400).json({ success: false, message: 'Cannot delete a finalized BOM' });
    }

    await bom.destroy(); // CASCADE deletes lines
    return res.json({ success: true, message: 'BOM deleted successfully' });
  } catch (err) {
    console.error('[deleteBom]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAllBoms, getBomByItemId, createOrUpdateBom, finalizeBom, deleteBom };
