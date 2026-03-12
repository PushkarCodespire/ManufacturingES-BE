/**
 * Multer file-upload configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * Files are saved to:  /api/uploads/<subfolder>/<timestamp>_<originalname>
 * They are served at:  http://localhost:5000/uploads/<subfolder>/...
 *   (express.static for /uploads is registered in config/app.js)
 */

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

/** Create diskStorage for a given subfolder, auto-creating the dir if needed */
const makeStorage = (subfolder) => {
  const dest = path.join(__dirname, '..', 'uploads', subfolder);
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename:    (_req, file, cb) => {
      // <timestamp>_<sanitised-original-name>  e.g.  1710000000000_spec_sheet.pdf
      const ts   = Date.now();
      const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      cb(null, `${ts}_${safe}`);
    },
  });
};

/** Allowed MIME / extension whitelist */
const ALLOWED_EXT = /pdf|doc|docx|xls|xlsx|jpg|jpeg|png|gif|bmp|webp|svg|txt|csv/;

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (ALLOWED_EXT.test(ext)) return cb(null, true);
  cb(new Error(`File type ".${ext}" is not allowed. Allowed: PDF, Word, Excel, images, text.`));
};

// ── Mold document uploader ──────────────────────────────────────────────────
const moldDocUpload = multer({
  storage:    makeStorage('mold-documents'),
  limits:     { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter,
});

module.exports = { moldDocUpload };
