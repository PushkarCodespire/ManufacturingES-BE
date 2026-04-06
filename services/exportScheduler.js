'use strict';

const cron = require('node-cron');
const fs   = require('fs');
const path = require('path');
const { UPLOAD_DIR } = require('../config/fileStorage');
const { runExport }  = require('./export.service');

/** Maximum age (in ms) for export files before cleanup — 30 days */
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Clean up export files older than 30 days.
 */
const cleanupOldExports = async () => {
  const { ExportJob }  = require('../models');
  const { Op }         = require('sequelize');

  const cutoff = new Date(Date.now() - MAX_AGE_MS);

  try {
    // Find old completed exports
    const oldJobs = await ExportJob.findAll({
      where: {
        status: 'completed',
        completed_at: { [Op.lt]: cutoff },
      },
    });

    let deletedFiles = 0;
    for (const job of oldJobs) {
      // Delete file from disk
      if (job.file_path && fs.existsSync(job.file_path)) {
        try {
          fs.unlinkSync(job.file_path);
          deletedFiles++;
        } catch (err) {
          console.error(`[exportScheduler] Failed to delete file ${job.file_path}:`, err.message);
        }
      }

      // Update the record
      await job.update({
        file_path:     null,
        file_size:     null,
        error_message: `File cleaned up after 30 days (original: ${path.basename(job.file_path || '')})`,
      });
    }

    if (oldJobs.length > 0) {
      console.log(`[exportScheduler] Cleanup: removed ${deletedFiles} files from ${oldJobs.length} old export jobs`);
    }
  } catch (err) {
    console.error('[exportScheduler] Cleanup error:', err.message);
  }
};

/**
 * Run scheduled export for all active organizations.
 */
const runScheduledExports = async () => {
  const { Organization, ExportJob } = require('../models');

  try {
    const orgs = await Organization.findAll({
      where: { is_active: true },
      attributes: ['id', 'name'],
    });

    console.log(`[exportScheduler] Starting scheduled exports for ${orgs.length} organization(s)`);

    for (const org of orgs) {
      try {
        const exportJob = await ExportJob.create({
          organization_id: org.id,
          type:            'full',
          format:          'json',
          status:          'pending',
          triggered_by:    'scheduled',
          created_by:      null,
        });

        await runExport(exportJob);
      } catch (err) {
        console.error(`[exportScheduler] Failed for org ${org.id} (${org.name}):`, err.message);
      }
    }

    // Run cleanup after exports
    await cleanupOldExports();
  } catch (err) {
    console.error('[exportScheduler] Scheduled export error:', err.message);
  }
};

/**
 * Start the export scheduler — call once on server boot.
 */
const startExportScheduler = () => {
  // Ensure exports directory exists
  const exportsDir = path.join(UPLOAD_DIR, 'exports');
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }

  // Schedule daily at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('[exportScheduler] Daily export job triggered at', new Date().toISOString());
    await runScheduledExports();
  });

  console.log('✅ Export scheduler initialized (daily at 2:00 AM)');
};

module.exports = { startExportScheduler, runScheduledExports, cleanupOldExports };
