const express = require('express');
const router = express.Router();
const {
  getAll, getByItemMachine, create, update, remove,
  recordReading, getReadingsByJobCard, getDeviations,
} = require('../modules/production/controller/processRecipe.controller');
const { authenticate, authorize } = require('../config/middleware');

router.use(authenticate);

// Recipes
router.get('/',                                    getAll);
router.get('/item/:itemId/machine/:machineId',     getByItemMachine);
router.post('/',    authorize('plant_head', 'it_admin', 'production_manager', 'quality_manager'), create);
router.patch('/:id', authorize('plant_head', 'it_admin', 'production_manager', 'quality_manager'), update);
router.delete('/:id', authorize('plant_head', 'it_admin'), remove);

// Readings
router.post('/readings',                           recordReading);
router.get('/readings/job-card/:jobCardId',        getReadingsByJobCard);
router.get('/readings/deviations',                 getDeviations);

module.exports = router;
