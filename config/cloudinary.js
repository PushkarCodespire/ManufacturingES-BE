/**
 * Cloudinary configuration
 * Used by upload.routes.js and config/upload.js (mold documents).
 * Falls back to local disk when CLOUDINARY_CLOUD_NAME is not set (local dev).
 */
const cloudinary = require('cloudinary').v2;

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

module.exports = { cloudinary, isConfigured, uploadBuffer };
