const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { authenticate } = require('../config/middleware');

// Ensure uploads directory exists
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage config — saves to /uploads with unique filename
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

// Accept images only, max 5MB
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/;
    const extOk   = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk  = allowed.test(file.mimetype);
    if (extOk && mimeOk) return cb(null, true);
    cb(new Error('Only image files (jpg, png, gif, webp, svg) are allowed'));
  },
});

// Accept documents (PDF + images), max 10MB
const ALLOWED_DOC_EXTS  = ['pdf', 'jpg', 'jpeg', 'png'];
const ALLOWED_DOC_MIMES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const uploadDoc = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mime = file.mimetype;
    if (ALLOWED_DOC_EXTS.includes(ext) && ALLOWED_DOC_MIMES.includes(mime)) return cb(null, true);
    cb(new Error('Only PDF and image files (jpg, png) are allowed'));
  },
});

// ─── POST /api/upload ───────────────────────────────────────────────────────
router.post('/', authenticate, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  // Build the URL path that maps to the static serve
  const fileUrl = `/uploads/${req.file.filename}`;

  return res.json({
    success:  true,
    message:  'File uploaded successfully',
    data: {
      url:      fileUrl,
      filename: req.file.filename,
      size:     req.file.size,
      mimetype: req.file.mimetype,
    },
  });
});

// ─── POST /api/upload/document ──────────────────────────────────────────────
// For RFQ drawings, item datasheets, etc. Accepts PDF + PNG/JPG, max 10MB.
router.post('/document', authenticate, uploadDoc.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;

  return res.json({
    success: true,
    message: 'Document uploaded successfully',
    data: {
      url:           fileUrl,
      filename:      req.file.filename,
      original_name: req.file.originalname,
      size:          req.file.size,
      mimetype:      req.file.mimetype,
    },
  });
});

// Error handling for multer
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
