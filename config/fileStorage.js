/**
 * PVC-based file storage configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * Replaces Cloudinary with local disk storage backed by a Kubernetes PVC.
 * Files are written to UPLOAD_DIR (default: ./uploads) and served via
 * GET /api/upload/image?file=<folder>/<filename>
 *
 * Environment variables:
 *   UPLOAD_DIR          - Physical path where files are saved (default: ./uploads)
 *   UPLOAD_PUBLIC_URL   - Full public URL prefix stored in DB
 *   UPLOAD_PUBLIC_PATH  - URL path for serving files (default: /api/upload/image)
 *   MAX_FILE_SIZE       - Max upload size in bytes (default: 52428800 = 50MB)
 */

const fs   = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { buildUploadUrl } = require('../utils/uploadPaths');

// ── Resolve upload directory ────────────────────────────────────────────────
const resolveUploadDir = () => {
  const inputPath = process.env.UPLOAD_DIR || process.env.UPLOAD_PATH || './uploads';
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(__dirname, '..', inputPath);
};

const UPLOAD_DIR = resolveUploadDir();
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '52428800', 10);

// ── Subdirectories created on startup ───────────────────────────────────────
const SUBDIRS = ['content', 'documents', 'mold-documents', 'temp'];

const ensureDirectories = () => {
  SUBDIRS.forEach(dir => {
    const fullPath = path.join(UPLOAD_DIR, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
};

// Create directories on module load
try {
  ensureDirectories();
  console.log('✅ Upload directories ready:', UPLOAD_DIR);
} catch (err) {
  console.warn('⚠️ Could not create upload directories:', err.message);
}

/**
 * Save a buffer to the PVC disk and return the public URL.
 *
 * @param {Buffer} buffer       - File buffer from multer memoryStorage
 * @param {string} originalname - Original filename (for extension)
 * @param {string} subDir       - Subdirectory under UPLOAD_DIR (e.g. 'content', 'documents')
 * @returns {string}            - Full public URL stored in the database
 */
const saveToDisk = (buffer, originalname, subDir = 'content') => {
  const dirPath = path.join(UPLOAD_DIR, subDir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const ext = path.extname(originalname).toLowerCase();
  const filename = `${uuidv4()}${ext}`;
  const dest = path.join(dirPath, filename);

  fs.writeFileSync(dest, buffer);

  // Return the full public URL (stored in DB)
  return buildUploadUrl(`${subDir}/${filename}`);
};

/**
 * Delete a file from disk given a public URL.
 *
 * @param {string} fileUrl - The public URL stored in DB
 * @returns {boolean}      - true if deleted, false otherwise
 */
const deleteFile = (fileUrl) => {
  try {
    if (!fileUrl) return false;

    // Extract relative path from URL
    let relativePath;
    if (fileUrl.includes('?file=')) {
      const url = new URL(fileUrl, 'http://localhost');
      relativePath = decodeURIComponent(url.searchParams.get('file') || '');
    } else if (fileUrl.startsWith('/uploads/')) {
      relativePath = fileUrl.replace('/uploads/', '');
    } else {
      return false;
    }

    if (!relativePath || relativePath.includes('..')) return false;

    const filePath = path.resolve(UPLOAD_DIR, relativePath);

    // Security: ensure resolved path is within UPLOAD_DIR
    if (!filePath.startsWith(path.resolve(UPLOAD_DIR))) return false;

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (err) {
    console.error('[deleteFile]', err.message);
    return false;
  }
};

module.exports = {
  UPLOAD_DIR,
  MAX_FILE_SIZE,
  saveToDisk,
  deleteFile,
  ensureDirectories,
  buildUploadUrl,
};
