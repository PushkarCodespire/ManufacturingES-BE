const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../config/middleware');
const { Organization } = require('../models');

/**
 * PATCH /api/organizations/:id — Update organization profile
 * Restricted to plant_head and it_admin roles.
 */
const updateOrganization = async (req, res) => {
  try {
    const { id } = req.params;

    // Ensure user belongs to this organization
    if (req.organizationId !== parseInt(id, 10)) {
      return res.status(403).json({ success: false, message: 'You can only update your own organization' });
    }

    const org = await Organization.findByPk(id);
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    // Allowed fields for update
    const allowedFields = [
      'name', 'email', 'phone', 'gstin', 'address',
      'logo_url', 'industry', 'plan',
    ];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    await org.update(updates);

    return res.json({
      success: true,
      message: 'Organization updated successfully',
      data: org,
    });
  } catch (err) {
    console.error('[updateOrganization]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/organizations/:id/complete-onboarding — Mark onboarding as complete
 * Restricted to plant_head and it_admin roles.
 */
const completeOnboarding = async (req, res) => {
  try {
    const { id } = req.params;

    // Ensure user belongs to this organization
    if (req.organizationId !== parseInt(id, 10)) {
      return res.status(403).json({ success: false, message: 'You can only complete onboarding for your own organization' });
    }

    const org = await Organization.findByPk(id);
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    await org.update({
      onboarding_completed: true,
      onboarding_step:      req.body.onboarding_step || 5,
    });

    return res.json({
      success: true,
      message: 'Onboarding completed successfully',
      data: org,
    });
  } catch (err) {
    console.error('[completeOnboarding]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Routes ────────────────────────────────────────────────────────────────────
router.patch('/:id',                  authenticate, authorize('plant_head', 'it_admin'), updateOrganization);
router.post('/:id/complete-onboarding', authenticate, authorize('plant_head', 'it_admin'), completeOnboarding);

module.exports = router;
