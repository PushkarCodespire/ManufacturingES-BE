const express = require('express');
const router  = express.Router();
const {
  getAll,
  getAllLogs,
  getById,
  update,
  testConnection,
  getLogs,
} = require('../modules/masters/controller/integration.controller');
const { authenticate, authorize } = require('../config/middleware');

router.use(authenticate);

// IMPORTANT: /logs must be registered before /:id to avoid Express treating
// the literal string "logs" as an :id parameter.
router.get('/',          getAll);
router.get('/logs',      getAllLogs);
router.get('/:id',       getById);
router.patch('/:id',     authorize('plant_head', 'it_admin'), update);
router.post('/:id/test', authorize('plant_head', 'it_admin'), testConnection);
router.get('/:id/logs',  getLogs);

module.exports = router;
