const { verifyToken } = require('../modules/auth/cred/auth.cred');
const { User, Role, Department } = require('../models');

// M-05: CSRF — allowed origins for cookie-consuming endpoints
const ALLOWED_ORIGINS = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://localhost:5174'];

/**
 * Authenticate JWT token — protects all private routes
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Role, attributes: ['id', 'name', 'label'] },
        { model: Department, attributes: ['id', 'code', 'name'] },
      ],
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    // Permissions-change invalidation: reject tokens issued before token_invalidated_at
    if (user.token_invalidated_at && decoded.iat * 1000 < new Date(user.token_invalidated_at).getTime()) {
      return res.status(401).json({ success: false, message: 'Session invalidated. Please log in again.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

/**
 * Restrict access to specific roles
 * Usage: authorize('plant_head', 'it_admin')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (!roles.includes(req.user.Role.name)) {
      return res.status(403).json({ success: false, message: 'Access denied for your role' });
    }
    next();
  };
};

/**
 * H-01: Enforce granular JSONB permission keys on sensitive write routes.
 *
 * Plant_head and it_admin bypass automatically (admin bypass pattern).
 * All other roles must have the exact permKey in their users.permissions array.
 *
 * Usage: requirePermission('store-requests-material_request-create_edit_delete')
 * Stack after authenticate + authorize:
 *   router.post('/', authenticate, authorize(...roles), requirePermission('...key'), ctrl)
 */
const ADMIN_ROLES = ['plant_head', 'it_admin'];

const requirePermission = (permKey) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    // Admin roles bypass all granular permission checks
    if (ADMIN_ROLES.includes(req.user.Role?.name)) return next();

    const perms = Array.isArray(req.user.permissions) ? req.user.permissions : [];
    if (!perms.includes(permKey)) {
      return res.status(403).json({
        success: false,
        message: `Permission '${permKey}' is required to perform this action`,
      });
    }
    next();
  };
};

/**
 * M-05: CSRF origin check — apply to all cookie-consuming endpoints
 * (POST /auth/refresh, POST /auth/logout).
 *
 * SameSite=Lax is the primary defence; this adds server-side depth:
 * requests that arrive with an Origin header must match ALLOWED_ORIGINS.
 * Same-origin browser requests may omit Origin (e.g. address-bar navigation),
 * so missing Origin is allowed — only a mismatched Origin is rejected.
 */
const validateOrigin = (req, res, next) => {
  const origin = req.headers.origin;
  if (!origin) return next(); // server-side / curl / same-origin nav — allow
  const allowed = ALLOWED_ORIGINS.some(o => origin.startsWith(o));
  if (!allowed) {
    return res.status(403).json({ success: false, message: 'CSRF check failed: origin not allowed' });
  }
  next();
};

module.exports = { authenticate, authorize, requirePermission, validateOrigin };
