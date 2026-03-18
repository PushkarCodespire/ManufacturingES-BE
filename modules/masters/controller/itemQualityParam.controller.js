const { ItemQualityParam, Item } = require('../../../models');

// GET /items/:itemId/quality-params
const getByItemId = async (req, res) => {
  try {
    const item = await Item.findByPk(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    const params = await ItemQualityParam.findAll({
      where:  { item_id: req.params.itemId },
      order:  [['sort_order', 'ASC'], ['id', 'ASC']],
    });
    return res.json({ success: true, data: params });
  } catch (err) {
    console.error('[getByItemId quality-params]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /items/:itemId/quality-params  — full replace (send all rows)
const bulkSave = async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId, 10);
    const item = await Item.findByPk(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    const rows = Array.isArray(req.body.params) ? req.body.params : [];

    // Delete existing, then bulk-create
    await ItemQualityParam.destroy({ where: { item_id: itemId } });

    const created = rows.length
      ? await ItemQualityParam.bulkCreate(
          rows.map((r, idx) => ({
            item_id:            itemId,
            param_name:         (r.param_name || '').trim(),
            specification:      r.specification  || null,
            min_value:          r.min_value  != null ? parseFloat(r.min_value) : null,
            max_value:          r.max_value  != null ? parseFloat(r.max_value) : null,
            unit:               r.unit               || null,
            measurement_method: r.measurement_method || null,
            is_critical:        !!r.is_critical,
            sort_order:         idx,
          }))
        )
      : [];

    return res.json({ success: true, message: 'Quality parameters saved', data: created });
  } catch (err) {
    console.error('[bulkSave quality-params]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /items/:itemId/quality-params/:paramId
const deleteParam = async (req, res) => {
  try {
    const param = await ItemQualityParam.findOne({
      where: { id: req.params.paramId, item_id: req.params.itemId },
    });
    if (!param) return res.status(404).json({ success: false, message: 'Parameter not found' });
    await param.destroy();
    return res.json({ success: true, message: 'Parameter deleted' });
  } catch (err) {
    console.error('[deleteParam quality-params]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getByItemId, bulkSave, deleteParam };
