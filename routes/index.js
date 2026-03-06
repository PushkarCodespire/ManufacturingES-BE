const express = require('express');
const router = express.Router();

const authRoutes         = require('./auth.routes');
const userRoutes         = require('./user.routes');
const auditRoutes        = require('./audit.routes');
const notificationRoutes = require('./notification.routes');
const siteRoutes         = require('./site.routes');
const shiftRoutes        = require('./shift.routes');

// Mount routes
router.use('/auth',          authRoutes);
router.use('/users',         userRoutes);
router.use('/audit',         auditRoutes);
router.use('/notifications', notificationRoutes);
router.use('/sites',         siteRoutes);
router.use('/shifts',        shiftRoutes);

module.exports = router;
