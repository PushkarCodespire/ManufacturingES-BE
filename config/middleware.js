const { verifyToken } = require('../modules/auth/cred/auth.cred');
const { User, Role, Department } = require('../models');

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

module.exports = { authenticate, authorize };
