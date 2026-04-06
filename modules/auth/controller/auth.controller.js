const crypto = require('crypto');
const {
  User, Role, Department, Site, Organization, LoginAttempt, AuditLog, Session, Notification,
} = require('../../../models');
const {
  validateLogin,
  validateRegister,
  validateChangePassword,
  hashPassword,
  comparePassword,
  generateToken,
} = require('../cred/auth.cred');
const { MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MINUTES, DEPARTMENTS, ROLES } = require('../../../config/constants');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract real client IP.
 * Uses req.ip which Express resolves correctly when `trust proxy` is set in app.js.
 * Falls back to socket remoteAddress. Never reads X-Forwarded-For directly —
 * that header is user-controllable and was bypassing the rate limiter (security audit finding #4).
 */
const getIP = (req) => req.ip || req.socket?.remoteAddress || 'unknown';

// ─── H-05: Per-IP login rate limiter ─────────────────────────────────────────
// Prevents a single IP from triggering mass account lockouts across all employees.
// In-memory sliding-window: max 30 attempts per 15-minute window per IP.
// NOTE: For multi-process / clustered deployments this should be backed by Redis.
const IP_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const IP_MAX_HITS  = 30;              // max login attempts per window per IP
const ipHitMap     = new Map();       // Map<ip, { count, windowStart }>

const checkIpRateLimit = (ip) => {
  const now  = Date.now();
  const slot = ipHitMap.get(ip) || { count: 0, windowStart: now };

  // Reset window if expired
  if (now - slot.windowStart >= IP_WINDOW_MS) {
    slot.count       = 0;
    slot.windowStart = now;
  }

  slot.count += 1;
  ipHitMap.set(ip, slot);

  if (slot.count > IP_MAX_HITS) {
    const retryAfter = Math.ceil((slot.windowStart + IP_WINDOW_MS - now) / 1000);
    return { blocked: true, retryAfter };
  }
  return { blocked: false };
};

// ─── H-06: Refresh-token cookie options ──────────────────────────────────────
const REFRESH_COOKIE = 'dt_refresh';
const COOKIE_OPTS = {
  httpOnly: true,                                     // inaccessible to JS — XSS safe
  sameSite: 'Lax',                                    // CSRF protection for cross-origin
  secure:   process.env.NODE_ENV === 'production',    // HTTPS-only in prod, HTTP allowed in dev
  maxAge:   8 * 60 * 60 * 1000,                      // matches session TTL (8 h)
  path:     '/',
};

/** Fire-and-forget audit entry */
const audit = (data) => AuditLog.create(data).catch((e) => console.error('[audit]', e.message));

/** SHA-256 hash of a refresh token — fast lookup, safe for random tokens */
const hashRefreshToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

/** Generate cryptographically secure refresh token */
const makeRefreshToken = () => crypto.randomBytes(64).toString('hex');

/** Notify IT Admin & Plant Head users — fire-and-forget */
const notifyAdmins = async (type, title, message, metadata = {}) => {
  try {
    const admins = await User.findAll({
      include: [{ model: Role, where: { name: ['it_admin', 'plant_head'] }, attributes: [] }],
      attributes: ['id'],
    });
    await Promise.all(
      admins.map((a) => Notification.create({ user_id: a.id, type, title, message, metadata }))
    );
  } catch (e) {
    console.error('[notifyAdmins]', e.message);
  }
};

/**
 * Generate a URL-safe slug from a company name.
 * e.g. "Acme Manufacturing Pvt Ltd" → "acme-manufacturing-pvt-ltd"
 */
const slugify = (text) =>
  text.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Generate a unique slug by appending a random suffix if the base slug already exists.
 */
const uniqueSlug = async (baseName) => {
  let slug = slugify(baseName);
  const existing = await Organization.findOne({ where: { slug } });
  if (existing) {
    const suffix = crypto.randomBytes(3).toString('hex');
    slug = `${slug}-${suffix}`;
  }
  return slug;
};

// ─── SYS-001: Login ───────────────────────────────────────────────────────────
const login = async (req, res) => {
  const ip         = getIP(req);
  const user_agent = req.headers['user-agent'] || null;

  // H-05: Block IPs that have exceeded the per-IP attempt limit
  const ipCheck = checkIpRateLimit(ip);
  if (ipCheck.blocked) {
    return res.status(429).json({
      success: false,
      message: `Too many login attempts from this IP. Try again in ${Math.ceil(ipCheck.retryAfter / 60)} minute(s).`,
    });
  }

  try {
    const { error, value } = validateLogin(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details.map((d) => d.message).join(', '),
      });
    }

    const { employee_id, email, password } = value;

    // Build lookup condition — employee_id OR email
    const whereClause = employee_id ? { employee_id } : { email };
    const lookupKey   = employee_id || email;

    // ── Check lockout ────────────────────────────────────────────────────────
    const attemptRecord = employee_id
      ? await LoginAttempt.findOne({ where: { employee_id } })
      : null;

    // ── Find user ────────────────────────────────────────────────────────────
    const user = await User.findOne({
      where: whereClause,
      include: [
        { model: Role,         attributes: ['id', 'name', 'label'] },
        { model: Department,   attributes: ['id', 'code', 'name']  },
        { model: Site,         attributes: ['id', 'name', 'code'], through: { attributes: [] } },
        { model: Organization, attributes: ['id', 'name', 'slug', 'plan', 'is_active'] },
      ],
    });

    if (!user) {
      await audit({ employee_id: employee_id || null, action: 'FAILED_LOGIN', status: 'FAILED', ip_address: ip, user_agent, metadata: { reason: 'User not found', lookup: lookupKey } });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.is_active) {
      await audit({ user_id: user.id, employee_id: user.employee_id, action: 'FAILED_LOGIN', status: 'FAILED', ip_address: ip, user_agent, metadata: { reason: 'Account inactive' } });
      return res.status(401).json({ success: false, message: 'Your account is inactive. Contact IT Admin.' });
    }

    // ── Lockout check (employee_id based) ────────────────────────────────────
    const lockoutRecord = attemptRecord || await LoginAttempt.findOne({ where: { employee_id: user.employee_id } });

    // ── Verify password ──────────────────────────────────────────────────────
    const isValid = await comparePassword(password, user.password_hash);

    if (!isValid) {
      const currentAttempts = (lockoutRecord?.attempts || 0) + 1;
      const shouldLock      = currentAttempts >= MAX_LOGIN_ATTEMPTS;
      const locked_until    = shouldLock
        ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
        : null;

      await LoginAttempt.upsert({ employee_id: user.employee_id, attempts: currentAttempts, locked_until });

      if (shouldLock) {
        await audit({
          user_id: user.id, employee_id: user.employee_id, action: 'ACCOUNT_LOCKED', status: 'FAILED',
          ip_address: ip, user_agent,
          metadata: { attempts: currentAttempts, locked_minutes: LOCKOUT_DURATION_MINUTES },
        });

        // SYS-001: Alert IT Admin & Plant Head via notifications
        await notifyAdmins(
          'FAILED_LOGIN_ALERT',
          'Account Locked',
          `Employee ${user.employee_id} (${user.name}) has been locked after ${currentAttempts} failed login attempts from IP ${ip}.`,
          { employee_id: user.employee_id, name: user.name, attempts: currentAttempts, ip_address: ip }
        );

        return res.status(429).json({
          success: false,
          message: `Too many failed attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.`,
        });
      }

      await audit({
        user_id: user.id, employee_id: user.employee_id, action: 'FAILED_LOGIN', status: 'FAILED',
        ip_address: ip, user_agent,
        metadata: { attempts: currentAttempts, remaining: MAX_LOGIN_ATTEMPTS - currentAttempts },
      });

      return res.status(401).json({
        success: false,
        message: `Invalid credentials. ${MAX_LOGIN_ATTEMPTS - currentAttempts} attempt(s) remaining before lockout.`,
      });
    }

    // ── Success — clear lockout ──────────────────────────────────────────────
    if (lockoutRecord) await lockoutRecord.destroy();

    // ── Generate access + refresh tokens ────────────────────────────────────
    const accessToken  = generateToken({
      id:              user.id,
      employee_id:     user.employee_id,
      role:            user.Role.name,
      organization_id: user.organization_id,
    });
    const refreshToken = makeRefreshToken();
    const refreshHash  = hashRefreshToken(refreshToken);

    // SYS-004: Persist session
    await Session.create({
      user_id:       user.id,
      refresh_token: refreshHash,
      expires_at:    new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
      ip_address:    ip,
      user_agent,
    });

    await audit({ user_id: user.id, employee_id: user.employee_id, action: 'LOGIN', status: 'SUCCESS', ip_address: ip, user_agent });

    // H-06: Set refresh token in httpOnly cookie — not accessible to JavaScript
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS);

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        token:          accessToken,
        // refresh_token intentionally omitted from body — delivered via httpOnly cookie
        is_first_login: user.is_first_login,
        user: {
          id:             user.id,
          employee_id:    user.employee_id,
          name:           user.name,
          email:          user.email,
          phone:          user.phone,
          role:           user.Role,
          department:     user.Department,
          sites:          user.Sites || [],
          is_first_login: user.is_first_login,
          permissions:    user.permissions ?? [],
        },
        organization: user.Organization || null,
      },
    });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// ─── Registration — Self-Service Company Signup ──────────────────────────────
const register = async (req, res) => {
  const ip         = getIP(req);
  const user_agent = req.headers['user-agent'] || null;

  try {
    const { error, value } = validateRegister(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details.map((d) => d.message).join(', '),
      });
    }

    const { company_name, name, email, phone, password, industry } = value;

    // ── Check email uniqueness ───────────────────────────────────────────────
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists. Please log in instead.',
      });
    }

    // ── Generate slug ────────────────────────────────────────────────────────
    const slug = await uniqueSlug(company_name);

    // ── Transaction: Create org → departments → roles → admin user ──────────
    const result = await Organization.sequelize.transaction(async (t) => {
      // 1. Create Organization
      const org = await Organization.create({
        name:                 company_name,
        slug,
        email,
        phone:                phone || null,
        industry:             industry || null,
        onboarding_completed: false,
        onboarding_step:      0,
        plan:                 'trial',
        is_active:            true,
      }, { transaction: t });

      // 2. Create default departments
      const deptMap = {}; // code → id
      for (const d of DEPARTMENTS) {
        const dept = await Department.create({
          code:            d.code,
          name:            d.name,
          organization_id: org.id,
        }, { transaction: t });
        deptMap[d.code] = dept.id;
      }

      // 3. Create default roles
      const roleMap = {}; // name → { id, dept_id }
      for (const r of ROLES) {
        const role = await Role.create({
          name:            r.name,
          label:           r.label,
          department_id:   deptMap[r.dept_code],
          organization_id: org.id,
        }, { transaction: t });
        roleMap[r.name] = { id: role.id, dept_id: deptMap[r.dept_code] };
      }

      // 4. Generate employee_id for the admin user
      // Pattern: first 2 chars of company name (uppercase) + management dept code (10) + 001
      const prefix = company_name
        .replace(/[^a-zA-Z]/g, '')
        .substring(0, 2)
        .toUpperCase()
        .padEnd(2, 'X'); // Ensure at least 2 chars
      const adminEmployeeId = `${prefix}10001`;

      // 5. Create admin user (plant_head role — full access)
      const password_hash = await hashPassword(password);
      const adminUser = await User.create({
        employee_id:     adminEmployeeId,
        name,
        email,
        phone:           phone || null,
        password_hash,
        role_id:         roleMap['plant_head'].id,
        department_id:   roleMap['plant_head'].dept_id,
        organization_id: org.id,
        is_first_login:  false,
        is_active:       true,
        permissions:     [],
      }, { transaction: t });

      // 6. Create session
      const refreshToken = makeRefreshToken();
      const refreshHash  = hashRefreshToken(refreshToken);
      await Session.create({
        user_id:       adminUser.id,
        refresh_token: refreshHash,
        expires_at:    new Date(Date.now() + 8 * 60 * 60 * 1000),
        ip_address:    ip,
        user_agent,
      }, { transaction: t });

      // 7. Set created_by on org now that we have the user id
      await org.update({ created_by: adminUser.id }, { transaction: t });

      return { org, adminUser, refreshToken, adminEmployeeId };
    });

    const { org, adminUser, refreshToken, adminEmployeeId } = result;

    // Generate access token
    const accessToken = generateToken({
      id:              adminUser.id,
      employee_id:     adminUser.employee_id,
      role:            'plant_head',
      organization_id: org.id,
    });

    await audit({
      user_id: adminUser.id, employee_id: adminEmployeeId,
      action: 'REGISTER', status: 'SUCCESS',
      ip_address: ip, user_agent,
      metadata: { organization_id: org.id, company_name },
    });

    // Set refresh token cookie
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS);

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        token: accessToken,
        user: {
          id:          adminUser.id,
          employee_id: adminUser.employee_id,
          name:        adminUser.name,
          email:       adminUser.email,
          phone:       adminUser.phone,
          role:        { id: adminUser.role_id, name: 'plant_head', label: 'Plant Head' },
          permissions: [],
        },
        organization: {
          id:                   org.id,
          name:                 org.name,
          slug:                 org.slug,
          plan:                 org.plan,
          onboarding_completed: org.onboarding_completed,
          onboarding_step:      org.onboarding_step,
        },
      },
    });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

// ─── SYS-004: Refresh access token (30-min rotation) ─────────────────────────
const refresh = async (req, res) => {
  // H-06: Read refresh token from httpOnly cookie (set by login); fall back to
  // request body for a one-release transition window so existing sessions aren't
  // immediately invalidated after deployment.
  const refresh_token = req.cookies?.[REFRESH_COOKIE] || req.body?.refresh_token;
  if (!refresh_token) {
    return res.status(400).json({ success: false, message: 'Refresh token required' });
  }

  try {
    const tokenHash = hashRefreshToken(refresh_token);

    const session = await Session.findOne({
      where: { refresh_token: tokenHash, is_revoked: false },
    });

    if (!session || new Date() > new Date(session.expires_at)) {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please log in again.',
      });
    }

    const user = await User.findByPk(session.user_id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Role,       attributes: ['id', 'name', 'label'] },
        { model: Department, attributes: ['id', 'code', 'name']  },
      ],
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    // Permissions-change invalidation: reject sessions created before token_invalidated_at
    if (user.token_invalidated_at && new Date(session.createdAt) < new Date(user.token_invalidated_at)) {
      await session.update({ is_revoked: true }); // Clean up the dead session
      return res.status(401).json({ success: false, message: 'Session invalidated. Please log in again.' });
    }

    // Revoke old session (token rotation for security)
    await session.update({ is_revoked: true });

    const newAccessToken  = generateToken({
      id:              user.id,
      employee_id:     user.employee_id,
      role:            user.Role.name,
      organization_id: user.organization_id,
    });
    const newRefreshToken = makeRefreshToken();
    const newRefreshHash  = hashRefreshToken(newRefreshToken);

    // Rolling 8h window — inactivity resets timer
    await Session.create({
      user_id:       user.id,
      refresh_token: newRefreshHash,
      expires_at:    new Date(Date.now() + 8 * 60 * 60 * 1000),
      ip_address:    session.ip_address,
      user_agent:    session.user_agent,
    });

    // H-06: Rotate the refresh token cookie
    res.cookie(REFRESH_COOKIE, newRefreshToken, COOKIE_OPTS);

    return res.json({
      success: true,
      // refresh_token intentionally omitted from body — delivered via httpOnly cookie
      data: { token: newAccessToken },
    });
  } catch (err) {
    console.error('[refresh]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── SYS-002: Change Password ─────────────────────────────────────────────────
const changePassword = async (req, res) => {
  const ip         = getIP(req);
  const user_agent = req.headers['user-agent'] || null;

  try {
    const { error, value } = validateChangePassword(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details.map((d) => d.message).join(', '),
      });
    }

    const { current_password, new_password } = value;

    const user    = await User.findByPk(req.user.id);
    const isValid = await comparePassword(current_password, user.password_hash);

    if (!isValid) {
      await audit({ user_id: user.id, employee_id: user.employee_id, action: 'PASSWORD_CHANGE', status: 'FAILED', ip_address: ip, user_agent, metadata: { reason: 'Incorrect current password' } });
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    // SYS-002: Block same-as-current password
    const isSame = await comparePassword(new_password, user.password_hash);
    if (isSame) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from your current password',
      });
    }

    const hash = await hashPassword(new_password);
    await user.update({ password_hash: hash, is_first_login: false });

    await audit({
      user_id: user.id, employee_id: user.employee_id,
      action: 'PASSWORD_CHANGE', status: 'SUCCESS',
      ip_address: ip, user_agent,
      metadata: { was_first_login: req.user.is_first_login ?? false },
    });

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('[changePassword]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── SYS-003: Admin Password Reset ───────────────────────────────────────────
const resetPassword = async (req, res) => {
  const ip         = getIP(req);
  const user_agent = req.headers['user-agent'] || null;

  try {
    const { employee_id } = req.body;
    if (!employee_id?.trim()) {
      return res.status(400).json({ success: false, message: 'Employee ID is required' });
    }

    const user = await User.findOne({
      where: { employee_id: employee_id.trim() },
      include: [{ model: Role, attributes: ['name', 'label'] }],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `No employee found with ID: ${employee_id}`,
      });
    }

    // Generate temp password — meets complexity (8+ chars, 1 upper, 1 number)
    const suffix      = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
    const tempPassword = `Temp@${suffix}1`;                                   // 12 chars total

    const hash = await hashPassword(tempPassword);
    await user.update({ password_hash: hash, is_first_login: true });

    // Revoke all active sessions — forces user to log in fresh
    await Session.update(
      { is_revoked: true },
      { where: { user_id: user.id, is_revoked: false } }
    );

    await audit({
      user_id: user.id, employee_id: user.employee_id,
      action: 'PASSWORD_RESET', status: 'SUCCESS',
      ip_address: ip, user_agent,
      metadata: { reset_by: req.user.employee_id, reset_by_name: req.user.name },
    });

    // Notify the affected user
    await Notification.create({
      user_id: user.id,
      type:    'PASSWORD_RESET',
      title:   'Password Reset by Admin',
      message: `Your password has been reset by ${req.user.name} (${req.user.employee_id}). Please log in with your temporary password and change it immediately.`,
      metadata: { reset_by: req.user.employee_id },
    });

    return res.json({
      success: true,
      message: `Password reset successful for ${user.name}`,
      data: {
        employee_id:   user.employee_id,
        name:          user.name,
        temp_password: tempPassword,   // Admin communicates this to the employee
      },
    });
  } catch (err) {
    console.error('[resetPassword]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /me ──────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    return res.json({ success: true, data: req.user });
  } catch (err) {
    console.error('[getMe]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /logout ─────────────────────────────────────────────────────────────
const logout = async (req, res) => {
  const ip         = getIP(req);
  const user_agent = req.headers['user-agent'] || null;

  // H-06: Read from httpOnly cookie (preferred) or body (backward compat)
  const refresh_token = req.cookies?.[REFRESH_COOKIE] || req.body?.refresh_token;
  if (refresh_token) {
    try {
      const tokenHash = hashRefreshToken(refresh_token);
      await Session.update(
        { is_revoked: true },
        { where: { user_id: req.user.id, refresh_token: tokenHash } }
      );
    } catch (e) {
      console.error('[logout revoke]', e.message);
    }
  }

  // H-06: Clear the httpOnly cookie
  res.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: 'Lax', path: '/' });

  await audit({
    user_id: req.user?.id, employee_id: req.user?.employee_id,
    action: 'LOGOUT', status: 'SUCCESS',
    ip_address: ip, user_agent,
  });

  return res.json({ success: true, message: 'Logged out successfully' });
};

module.exports = { login, register, refresh, changePassword, resetPassword, getMe, logout };
