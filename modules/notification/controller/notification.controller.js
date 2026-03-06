const { Notification } = require('../../../models');
const { Op } = require('sequelize');

// ─── Helper: parse pagination ─────────────────────────────────────────────────
const paginate = (query) => {
  const page  = Math.max(1, parseInt(query.page  || 1,  10));
  const limit = Math.min(50, Math.max(1, parseInt(query.limit || 20, 10)));
  return { limit, offset: (page - 1) * limit, page };
};

// ─── GET /notifications — my notifications (paginated, newest first) ──────────
const getMyNotifications = async (req, res) => {
  try {
    const { limit, offset, page } = paginate(req.query);

    const { count, rows } = await Notification.findAndCountAll({
      where:  { user_id: req.user.id },
      order:  [['createdAt', 'DESC']],
      limit,
      offset,
    });

    const unreadCount = await Notification.count({
      where: { user_id: req.user.id, is_read: false },
    });

    return res.json({
      success: true,
      data: {
        notifications: rows,
        total:         count,
        unreadCount,
        page,
        totalPages:    Math.ceil(count / limit),
      },
    });
  } catch (err) {
    console.error('[getMyNotifications]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /notifications/unread-count — badge count for bell ──────────────────
const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.count({
      where: { user_id: req.user.id, is_read: false },
    });
    return res.json({ success: true, data: { count } });
  } catch (err) {
    console.error('[getUnreadCount]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PATCH /notifications/:id/read — mark single notification as read ─────────
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (!notification.is_read) {
      await notification.update({ is_read: true, read_at: new Date() });
    }

    return res.json({ success: true, message: 'Marked as read' });
  } catch (err) {
    console.error('[markAsRead]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PATCH /notifications/read-all — mark all as read ────────────────────────
const markAllAsRead = async (req, res) => {
  try {
    await Notification.update(
      { is_read: true, read_at: new Date() },
      { where: { user_id: req.user.id, is_read: false } }
    );
    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error('[markAllAsRead]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getMyNotifications, getUnreadCount, markAsRead, markAllAsRead };
