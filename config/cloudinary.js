/**
 * Cloudinary configuration
 * Used by upload.routes.js and config/upload.js (mold documents).
 * Falls back to local disk (UPLOAD_DIR env var) when CLOUDINARY_CLOUD_NAME is not set.
 */
const cloudinary = require('cloudinary').v2;
const fs         = require('fs');
const path       = require('path');
const crypto     = require('crypto');

if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure:     true,
  });
}

const isConfigured = !!process.env.CLOUDINARY_CLOUD_NAME;

/**
 * Upload a buffer to Cloudinary.
 * @param {Buffer} buffer     - File buffer from multer memoryStorage
 * @param {object} options    - Cloudinary upload options (folder, resource_type, etc.)
 * @returns {Promise<string>} - Secure URL of the uploaded file
 */
const uploadBuffer = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result.secure_url);
    });
    stream.end(buffer);
  });

/**
 * Save a buffer to the local uploads directory (fallback when Cloudinary is not configured).
 * Directory is controlled by the UPLOAD_DIR env var (default: /uploads).
 *
 * @param {Buffer} buffer        - File buffer from multer memoryStorage
 * @param {string} originalname  - Original filename from req.file.originalname
 * @param {string} mimetype      - MIME type from req.file.mimetype (unused, kept for future use)
 * @returns {string}             - Relative URL path to serve the file (e.g. /uploads/abc123.pdf)
 */
const saveToLocal = (buffer, originalname, mimetype) => {
  // Resolve upload directory — absolute path derived from UPLOAD_DIR env var
  const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'uploads');

  // Create directory recursively if it doesn't exist
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Generate a unique filename to avoid collisions: <timestamp>-<random>.<ext>
  const ext      = path.extname(originalname).toLowerCase();
  const uid      = crypto.randomBytes(8).toString('hex');
  const filename = `${Date.now()}-${uid}${ext}`;
  const dest     = path.join(uploadDir, filename);

  fs.writeFileSync(dest, buffer);

  // Return a URL path the frontend can use (served as static by Express)
  return `/uploads/${filename}`;
};

module.exports = { cloudinary, isConfigured, uploadBuffer, saveToLocal };
