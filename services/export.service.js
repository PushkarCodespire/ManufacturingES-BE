'use strict';

const fs   = require('fs');
const path = require('path');
const { UPLOAD_DIR } = require('../config/fileStorage');

/**
 * Module map — maps module key to { model, exclude? }
 * Each entry fetches from the corresponding Sequelize model.
 */
const getModuleMap = () => {
  const models = require('../models');
  return {
    items:            { model: models.Item,            exclude: [] },
    vendors:          { model: models.Vendor,          exclude: [] },
    machines:         { model: models.Machine,         exclude: [] },
    warehouses:       { model: models.Warehouse,       exclude: [] },
    shifts:           { model: models.Shift,           exclude: [] },
    work_centers:     { model: models.WorkCenter,      exclude: [] },
    work_orders:      { model: models.WorkOrder,       exclude: [] },
    job_cards:        { model: models.JobCard,         exclude: [] },
    grns:             { model: models.Grn,             exclude: [] },
    purchase_orders:  { model: models.PurchaseOrder,   exclude: [] },
    users:            { model: models.User,            exclude: ['password_hash'] },
  };
};

/**
 * Convert an array of Sequelize instances to CSV string.
 */
const toCsv = (rows) => {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    const vals = headers.map(h => {
      let v = row[h];
      if (v === null || v === undefined) return '';
      if (typeof v === 'object') v = JSON.stringify(v);
      // Escape CSV: wrap in quotes if contains comma, newline, or quote
      const str = String(v);
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    lines.push(vals.join(','));
  }
  return lines.join('\n');
};

/**
 * Export data for a single module.
 * @param {string} moduleKey
 * @param {number|null} organizationId
 * @returns {{ data: object[], count: number }}
 */
const exportModule = async (moduleKey, organizationId) => {
  const moduleMap = getModuleMap();
  const entry = moduleMap[moduleKey];
  if (!entry) return { data: [], count: 0 };

  const where = {};
  if (organizationId) where.organization_id = organizationId;

  const opts = { where, raw: true };
  if (entry.exclude && entry.exclude.length > 0) {
    opts.attributes = { exclude: entry.exclude };
  }

  const rows = await entry.model.findAll(opts);
  return { data: rows, count: rows.length };
};

/**
 * Run an export job end-to-end.
 * @param {object} exportJob - ExportJob Sequelize instance
 */
const runExport = async (exportJob) => {
  const { ExportJob } = require('../models');

  try {
    // Mark as processing
    await exportJob.update({ status: 'processing' });

    const moduleMap = getModuleMap();
    let allData = {};
    let totalRecords = 0;

    if (exportJob.type === 'module' && exportJob.module) {
      // Single module export
      const { data, count } = await exportModule(exportJob.module, exportJob.organization_id);
      allData[exportJob.module] = data;
      totalRecords = count;
    } else {
      // Full export — all modules
      for (const key of Object.keys(moduleMap)) {
        const { data, count } = await exportModule(key, exportJob.organization_id);
        allData[key] = data;
        totalRecords += count;
      }
    }

    // Build output directory
    const orgDir = path.join(UPLOAD_DIR, 'exports', String(exportJob.organization_id || 'global'));
    fs.mkdirSync(orgDir, { recursive: true });

    // Build filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = exportJob.format === 'csv' ? 'csv' : 'json';
    const typeSuffix = exportJob.type === 'module' ? exportJob.module : 'full';
    const filename = `${timestamp}-${typeSuffix}.${ext}`;
    const filePath = path.join(orgDir, filename);

    // Write file
    let content;
    if (exportJob.format === 'csv') {
      // For CSV: if full export, concatenate all modules with headers
      const sections = [];
      for (const [key, rows] of Object.entries(allData)) {
        if (rows.length > 0) {
          sections.push(`# ${key}`);
          sections.push(toCsv(rows));
          sections.push('');
        }
      }
      content = sections.join('\n');
    } else {
      content = JSON.stringify(allData, null, 2);
    }

    fs.writeFileSync(filePath, content, 'utf8');

    const stats = fs.statSync(filePath);

    // Update job as completed
    await exportJob.update({
      status:       'completed',
      file_path:    filePath,
      file_size:    stats.size,
      record_count: totalRecords,
      completed_at: new Date(),
    });

    console.log(`[export] Job ${exportJob.id} completed — ${totalRecords} records, ${stats.size} bytes`);
  } catch (err) {
    console.error(`[export] Job ${exportJob.id} failed:`, err.message);
    await exportJob.update({
      status:        'failed',
      error_message: err.message,
    }).catch(() => {});
  }
};

module.exports = { runExport, exportModule, getModuleMap };
