/**
 * Upload URL builder — converts relative file paths to public URLs.
 * Adapted from PVC File Storage Guide for GKE deployments.
 *
 * DB stores full public URLs like:
 *   https://mes.dev.gcp.codespiresolutions.com/api/upload/image?file=content%2Fabc123.jpg
 *
 * When serving, the URL is decoded back to a filesystem path and streamed.
 */

const trimSlashes = (value, type) => {
  if (!value) return value;
  if (type === 'leading') return value.replace(/^\/+/, '');
  return value.replace(/\/+$/, '');
};

/**
 * Converts a relative file path to a full public URL.
 *
 * Example:
 *   buildUploadUrl("content/abc123.jpg")
 *   → "https://domain.com/api/upload/image?file=content%2Fabc123.jpg"
 */
const buildUploadUrl = (relativePath) => {
  const publicUrl = process.env.UPLOAD_PUBLIC_URL;
  const publicPath = process.env.UPLOAD_PUBLIC_PATH || '/api/upload/image';

  const baseSource = publicUrl || publicPath;
  const base = trimSlashes(baseSource, 'trailing');
  const cleanRelative = trimSlashes(relativePath, 'leading');

  // Use query param format: ?file=folder%2Ffilename
  if (base.endsWith('/api/upload/image')) {
    return `${base}?file=${encodeURIComponent(cleanRelative)}`;
  }

  return `${base}/${cleanRelative}`;
};

/**
 * Same as buildUploadUrl but adds ?download=true to force browser download.
 */
const buildDownloadUrl = (relativePath) => {
  const url = buildUploadUrl(relativePath);
  return url.includes('?') ? `${url}&download=true` : `${url}?download=true`;
};

/**
 * Returns all known URL prefixes for uploaded files.
 * Used to strip the prefix and get the relative path back.
 */
const getUploadPathPrefixes = () => {
  const prefixes = new Set([
    process.env.UPLOAD_PUBLIC_PATH || '/api/upload/image',
    '/uploads',
    '/api/uploads',
    '/api/download',
    '/api/upload/file',
    '/api/upload/image',
  ]);

  const publicUrl = process.env.UPLOAD_PUBLIC_URL;
  if (publicUrl) {
    prefixes.add(publicUrl);
    try {
      const url = new URL(publicUrl);
      if (url.pathname) prefixes.add(url.pathname);
    } catch {
      // ignore invalid URL
    }
  }

  return Array.from(prefixes)
    .filter(Boolean)
    .map(prefix => (prefix.endsWith('/') ? prefix : `${prefix}/`));
};

module.exports = { buildUploadUrl, buildDownloadUrl, getUploadPathPrefixes };
