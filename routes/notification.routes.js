const express = require('express');
const router  = express.Router();
const { authenticate } = require('../config/middleware');
const {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} = require('../modules/notification/controller/notification.controller');

// All notification routes require authentication
router.use(authenticate);

router.get('/',                    getMyNotifications); // GET  /notifications
router.get('/unread-count',        getUnreadCount);     // GET  /notifications/unread-count
router.patch('/:id/read',          markAsRead);         // PATCH /notifications/:id/read
router.patch('/read-all',          markAllAsRead);      // PATCH /notifications/read-all

module.exports = router;
