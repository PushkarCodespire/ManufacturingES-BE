/**
 * Multer file-upload configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * All uploads go to Cloudinary via uploadBuffer() when CLOUDINARY_CLOUD_NAME
 * is set (production / Render).  Local dev falls back gracefully — the buffer
 * is available via req.file.buffer for controllers to handle directly.
 *
 * NOTE: diskStorage is intentionally removed — Render's filesystem is ephemeral.
 */

const multer = require('multer');
const path   = require('path');

/**
 * Allowed MIME / extension whitelist.
 * SVG is intentionally excluded — SVG files support embedded <script> tags
 * and JavaScript event handlers, making them a stored XSS vector (security audit finding #3).
 */
const ALLOWED_EXT = /pdf|doc|docx|xls|xlsx|jpg|jpeg|png|gif|bmp|webp|txt|csv/;

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (ALLOWED_EXT.test(ext)) return cb(null, true);
  cb(new Error(`File type ".${ext}" is not allowed. Allowed: PDF, Word, Excel, images, text.`));
};

// ── Mold document uploader ────────────────────────────────────────────────────
// Uses memoryStorage so req.file.buffer is available for Cloudinary upload.
const moldDocUpload = multer({
  storage:    multer.memoryStorage(),
  limits:     { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter,
});

// ── Vision / AI image uploader (memory storage — no disk write) ───────────────
// Keeps the file in req.file.buffer so the controller can base64-encode it
// and pass it to Claude Vision. Accepts only images and PDFs, max 5 MB.
const VISION_MIME = /^(image\/(jpeg|png|webp)|application\/pdf)$/;

const visionFilter = (_req, file, cb) => {
  if (VISION_MIME.test(file.mimetype)) return cb(null, true);
  cb(new Error('Vision AI accepts JPEG, PNG, WebP images or PDF only.'));
};

const visionUpload = multer({
  storage:    multer.memoryStorage(),
  limits:     { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: visionFilter,
});

module.exports = { moldDocUpload, visionUpload };
