const { Op } = require('sequelize');
const { Tag, User } = require('../../../models');

const AUDIT_USER_ATTRS = ['id', 'name', 'employee_id'];

const auditIncludes = [
  { model: User, as: 'Creator', attributes: AUDIT_USER_ATTRS },
  { model: User, as: 'Updater', attributes: AUDIT_USER_ATTRS },
];

// ─── GET /tags ──────────────────────────────────────────────────────────────
const getAllTags = async (req, res) => {
  try {
    const where = {};
    if (req.query.tag_type) where.tag_type = req.query.tag_type;
    if (req.query.search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${req.query.search}%` } },
        { tag_type: { [Op.iLike]: `%${req.query.search}%` } },
      ];
    }

    const tags = await Tag.findAll({
      where,
      include: auditIncludes,
      order: [['name', 'ASC']],
    });
    return res.json({ success: true, data: tags });
  } catch (err) {
    console.error('[getAllTags]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /tags/:id ──────────────────────────────────────────────────────────
const getTagById = async (req, res) => {
  try {
    const tag = await Tag.findByPk(req.params.id, { include: auditIncludes });
    if (!tag) return res.status(404).json({ success: false, message: 'Tag not found' });
    return res.json({ success: true, data: tag });
  } catch (err) {
    console.error('[getTagById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /tags ─────────────────────────────────────────────────────────────
const createTag = async (req, res) => {
  try {
    const { name, tag_type, site_ids } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Tag name is required' });
    }

    const tag = await Tag.create({
      name:          name.trim(),
      tag_type:      tag_type || 'General',
      is_item_group: tag_type === 'Item Group',
      is_system:     true,
      site_ids:      Array.isArray(site_ids) ? site_ids : [],
      created_by:    req.user?.id || null,
      updated_by:    req.user?.id || null,
    });

    const full = await Tag.findByPk(tag.id, { include: auditIncludes });
    return res.status(201).json({
      success: true,
      message: `Tag "${tag.name}" created successfully`,
      data: full,
    });
  } catch (err) {
    console.error('[createTag]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PATCH /tags/:id ────────────────────────────────────────────────────────
const updateTag = async (req, res) => {
  try {
    const tag = await Tag.findByPk(req.params.id);
    if (!tag) return res.status(404).json({ success: false, message: 'Tag not found' });

    const { id, createdAt, updatedAt, created_by, ...updateData } = req.body;
    updateData.updated_by = req.user?.id || null;
    if (updateData.tag_type) {
      updateData.is_item_group = updateData.tag_type === 'Item Group';
    }

    await tag.update(updateData);
    const full = await Tag.findByPk(tag.id, { include: auditIncludes });
    return res.json({ success: true, message: 'Tag updated successfully', data: full });
  } catch (err) {
    console.error('[updateTag]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── DELETE /tags/:id ───────────────────────────────────────────────────────
const deleteTag = async (req, res) => {
  try {
    const tag = await Tag.findByPk(req.params.id);
    if (!tag) return res.status(404).json({ success: false, message: 'Tag not found' });

    await tag.destroy();
    return res.json({ success: true, message: `Tag "${tag.name}" deleted successfully` });
  } catch (err) {
    console.error('[deleteTag]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAllTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
};
