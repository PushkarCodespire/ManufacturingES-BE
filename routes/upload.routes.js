const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const { authenticate }            = require('../config/middleware');
const { uploadBuffer, isConfigured, saveToLocal } = require('../config/cloudinary');

// ── In-memory storage (no disk writes — required for Cloudinary + Render) ─────
const memStorage = multer.memoryStorage();

// Accept images only, max 5 MB
const upload = multer({
  storage: memStorage,
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    // SVG excluded — it supports embedded <script> tags and causes stored XSS (security audit finding #3)
    const allowed = /jpeg|jpg|png|gif|webp/;
    const extOk   = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk  = allowed.test(file.mimetype);
    if (extOk && mimeOk) return cb(null, true);
    cb(new Error('Only image files (jpg, png, gif, webp) are allowed'));
  },
});

// Accept documents (PDF + images), max 10 MB
const ALLOWED_DOC_EXTS  = ['pdf', 'jpg', 'jpeg', 'png'];
const ALLOWED_DOC_MIMES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const uploadDoc = multer({
  storage: memStorage,
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mime = file.mimetype;
    if (ALLOWED_DOC_EXTS.includes(ext) && ALLOWED_DOC_MIMES.includes(mime)) return cb(null, true);
    cb(new Error('Only PDF and image files (jpg, png) are allowed'));
  },
});

// ─── POST /api/upload ─────────────────────────────────────────────────────────
router.post('/', authenticate, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  try {
    let fileUrl;

    if (isConfigured) {
      // Upload buffer to Cloudinary
      fileUrl = await uploadBuffer(req.file.buffer, {
        folder:        'dynatech/uploads',
        resource_type: 'image',
      });
    } else {
      // Local fallback — save to UPLOAD_DIR and return a /uploads/<file> URL
      fileUrl = saveToLocal(req.file.buffer, req.file.originalname, req.file.mimetype);
    }

    return res.json({
      success:  true,
      message:  'File uploaded successfully',
      data: {
        url:      fileUrl,
        filename: req.file.originalname,
        size:     req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (err) {
    console.error('[upload]', err);
    return res.status(500).json({ success: false, message: 'Upload failed: ' + err.message });
  }
});

// ─── POST /api/upload/document ────────────────────────────────────────────────
// For RFQ drawings, item datasheets, etc. Accepts PDF + PNG/JPG, max 10 MB.
router.post('/document', authenticate, uploadDoc.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  try {
    let fileUrl;

    if (isConfigured) {
      const isPdf        = req.file.mimetype === 'application/pdf';
      fileUrl = await uploadBuffer(req.file.buffer, {
        folder:        'dynatech/documents',
        resource_type: isPdf ? 'raw' : 'image',
        use_filename:  true,
        unique_filename: true,
      });
    } else {
      // Local fallback — save to UPLOAD_DIR and return a /uploads/<file> URL
      fileUrl = saveToLocal(req.file.buffer, req.file.originalname, req.file.mimetype);
    }

    return res.json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        url:           fileUrl,
        filename:      req.file.originalname,
        original_name: req.file.originalname,
        size:          req.file.size,
        mimetype:      req.file.mimetype,
      },
    });
  } catch (err) {
    console.error('[upload/document]', err);
    return res.status(500).json({ success: false, message: 'Upload failed: ' + err.message });
  }
});

// Error handling for multer
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError || err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
