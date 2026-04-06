'use strict';

const fs   = require('fs');
const path = require('path');
const { ExportJob, User, Organization } = require('../../../models');
const { runExport } = require('../../../services/export.service');

/**
 * POST /api/exports — Trigger an export job
 */
const triggerExport = async (req, res) => {
  try {
    const { type = 'full', module: mod, format = 'json' } = req.body;

    // Validate inputs
    const validTypes   = ['full', 'module'];
    const validFormats = ['json', 'csv'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, message: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
    }
    if (!validFormats.includes(format)) {
      return res.status(400).json({ success: false, message: `Invalid format. Must be one of: ${validFormats.join(', ')}` });
    }
    if (type === 'module' && !mod) {
      return res.status(400).json({ success: false, message: 'Module is required when type is "module"' });
    }

    const exportJob = await ExportJob.create({
      organization_id: req.organizationId,
      type,
      module:          mod || null,
      format,
      status:          'pending',
      triggered_by:    'manual',
      created_by:      req.user.id,
    });

    // Run export asynchronously (don't await)
    runExport(exportJob).catch(err => {
      console.error('[triggerExport] async export error:', err.message);
    });

    return res.status(202).json({
      success: true,
      message: 'Export job started',
      data:    exportJob,
    });
  } catch (err) {
    console.error('[triggerExport]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/exports — List exports for organization
 */
const listExports = async (req, res) => {
  try {
    const where = {};
    if (req.organizationId) where.organization_id = req.organizationId;

    const exports = await ExportJob.findAll({
      where,
      order: [['created_at', 'DESC']],
      include: [
        { model: User, as: 'Creator', attributes: ['id', 'first_name', 'last_name', 'employee_id'] },
      ],
    });

    return res.json({ success: true, data: exports });
  } catch (err) {
    console.error('[listExports]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/exports/:id — Get a single export job
 */
const getExport = async (req, res) => {
  try {
    const exportJob = await ExportJob.findByPk(req.params.id, {
      include: [
        { model: User, as: 'Creator', attributes: ['id', 'first_name', 'last_name', 'employee_id'] },
      ],
    });

    if (!exportJob) {
      return res.status(404).json({ success: false, message: 'Export job not found' });
    }

    // Org scope check
    if (req.organizationId && exportJob.organization_id !== req.organizationId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    return res.json({ success: true, data: exportJob });
  } catch (err) {
    console.error('[getExport]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/exports/:id/download — Download export file
 */
const downloadExport = async (req, res) => {
  try {
    const exportJob = await ExportJob.findByPk(req.params.id);

    if (!exportJob) {
      return res.status(404).json({ success: false, message: 'Export job not found' });
    }

    // Org scope check
    if (req.organizationId && exportJob.organization_id !== req.organizationId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (exportJob.status !== 'completed' || !exportJob.file_path) {
      return res.status(400).json({ success: false, message: 'Export not ready for download' });
    }

    if (!fs.existsSync(exportJob.file_path)) {
      return res.status(404).json({ success: false, message: 'Export file not found on disk' });
    }

    const filename = path.basename(exportJob.file_path);
    const contentType = exportJob.format === 'csv' ? 'text/csv' : 'application/json';

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', contentType);

    const stream = fs.createReadStream(exportJob.file_path);
    stream.pipe(res);
  } catch (err) {
    console.error('[downloadExport]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  triggerExport,
  listExports,
  getExport,
  downloadExport,
};
