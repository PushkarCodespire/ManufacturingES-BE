/**
 * Upload routes — PVC disk storage
 * ─────────────────────────────────────────────────────────────────────────────
 * POST endpoints save files to disk (PVC volume in GKE, local dir in dev).
 * GET endpoints stream files back with security checks.
 *
 * URL stored in DB: https://domain.com/api/upload/image?file=content%2Fuuid.jpg
 */

const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../config/middleware');
const { UPLOAD_DIR, MAX_FILE_SIZE } = require('../config/fileStorage');
const { buildUploadUrl } = require('../utils/uploadPaths');

// ── Allowed folders for GET (serve) ─────────────────────────────────────────
const allowedFolders = new Set(['content', 'documents', 'mold-documents', 'temp']);

// ── Security: prevent path traversal ────────────────────────────────────────
const isSafeFilename = (filename) => {
  if (!filename) return false;
  if (filename.includes('..')) return false;
  if (filename.includes('/') || filename.includes('\\')) return false;
  if (path.isAbsolute(filename)) return false;
  return true;
};

// ── Disk storage factory ────────────────────────────────────────────────────
const createStorage = (subDir) => {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      const uploadPath = path.join(UPLOAD_DIR, subDir);
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (_req, file, cb) => {
      const uniqueName = `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`;
      cb(null, uniqueName);
    },
  });
};

// ── File type filters ───────────────────────────────────────────────────────
const imageFilter = (_req, file, cb) => {
  // SVG excluded — stored XSS vector (security audit finding #3)
  const allowed = /jpeg|jpg|png|gif|webp/;
  const extOk  = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);
  if (extOk && mimeOk) return cb(null, true);
  cb(new Error('Only image files (jpg, png, gif, webp) are allowed'));
};

const documentFilter = (_req, file, cb) => {
  const allowedExts  = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv'];
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (allowedExts.includes(ext)) return cb(null, true);
  cb(new Error(`File type ".${ext}" is not allowed. Allowed: PDF, images, Word, Excel, text.`));
};

// ── Upload middleware instances ──────────────────────────────────────────────
const uploadImage = multer({
  storage:    createStorage('content'),
  limits:     { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: imageFilter,
});

const uploadDocument = multer({
  storage:    createStorage('documents'),
  limits:     { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: documentFilter,
});

// ─── POST /api/upload  (images — profile pics, item images, etc.) ───────────
router.post('/', authenticate, uploadImage.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  try {
    const fileUrl = buildUploadUrl(`content/${req.file.filename}`);

    return res.json({
      success: true,
      message: 'File uploaded successfully',
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

// ─── POST /api/upload/document  (PDFs, drawings, datasheets) ────────────────
router.post('/document', authenticate, uploadDocument.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  try {
    const fileUrl = buildUploadUrl(`documents/${req.file.filename}`);

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

// ─── GET /api/upload/image?file=content/uuid.jpg  (primary serve route) ─────
// This is the URL format stored in the database.
router.get('/image', async (req, res) => {
  try {
    const rawFile = Array.isArray(req.query.file) ? req.query.file[0] : req.query.file;
    const fileParam = typeof rawFile === 'string' ? rawFile : '';

    if (!fileParam) {
      return res.status(400).json({ success: false, message: 'file query param is required' });
    }

    const cleanRelative = fileParam.replace(/^\/+/, '');
    const parts = cleanRelative.split('/').filter(Boolean);

    if (parts.length !== 2) {
      return res.status(400).json({ success: false, message: 'Invalid file path. Expected: folder/filename' });
    }

    const [folder, filename] = parts;
    return await serveFile(req, res, folder, filename);
  } catch (err) {
    console.error('[upload/serve]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── GET /api/upload/file/:folder/:filename  (alternative path format) ──────
router.get('/file/:folder/:filename', async (req, res) => {
  try {
    return await serveFile(req, res, req.params.folder, req.params.filename);
  } catch (err) {
    console.error('[upload/serve]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── File streaming helper with security checks ────────────────────────────
async function serveFile(req, res, folder, filename) {
  if (!allowedFolders.has(folder)) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }

  if (!isSafeFilename(filename)) {
    return res.status(400).json({ success: false, message: 'Invalid file name' });
  }

  const rootDir  = path.resolve(UPLOAD_DIR);
  const filePath = path.resolve(rootDir, folder, filename);

  // Path traversal guard
  if (!filePath.startsWith(path.join(rootDir, folder))) {
    return res.status(400).json({ success: false, message: 'Invalid file path' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }

  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }

  // Determine content type from extension
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.txt': 'text/plain', '.csv': 'text/csv',
  };
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Length', stat.size.toString());
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

  // ?download=true forces browser to download
  if (req.query.download === 'true') {
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  } else {
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  }

  const stream = fs.createReadStream(filePath);
  stream.on('error', () => {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to read file' });
    } else {
      res.end();
    }
  });
  stream.pipe(res);
}

// ── Multer error handler ────────────────────────────────────────────────────
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File too large' });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
