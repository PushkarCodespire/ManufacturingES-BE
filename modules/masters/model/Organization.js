const { DataTypes } = require('sequelize');
const sequelize     = require('../../../config/database');

/**
 * Organization — tenant entity for multi-tenant SaaS.
 * Each company that registers gets its own Organization row.
 * The default "Dynatech Demo" org (id=1) holds all seeded demo data.
 */
const Organization = sequelize.define(
  'Organization',
  {
    id:   { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(200), allowNull: false, comment: 'Company display name' },
    slug: {
      type:      DataTypes.STRING(100),
      allowNull: false,
      unique:    true,
      comment:   'URL-safe unique identifier e.g. dynatech-demo',
    },
    email:    { type: DataTypes.STRING(150), allowNull: true },
    phone:    { type: DataTypes.STRING(20),  allowNull: true },
    gstin:    { type: DataTypes.STRING(20),  allowNull: true, comment: '15-char GST number' },
    address:  { type: DataTypes.JSONB, defaultValue: {}, comment: '{ line1, line2, city, state, pincode, country }' },
    logo_url: { type: DataTypes.STRING(500), allowNull: true },
    industry: { type: DataTypes.STRING(100), allowNull: true, comment: 'e.g. Automotive, Plastics, Electronics' },

    // Onboarding wizard state
    onboarding_completed: { type: DataTypes.BOOLEAN, defaultValue: false },
    onboarding_step:      { type: DataTypes.INTEGER, defaultValue: 0, comment: 'Current onboarding step (0-5)' },

    // Subscription
    plan: { type: DataTypes.STRING(30), defaultValue: 'trial', comment: 'trial | starter | professional | enterprise' },

    is_active:  { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by: {
      type:      DataTypes.INTEGER,
      allowNull: true,
      comment:   'User ID of the person who created this org (null for self-registered)',
    },
  },
  {
    tableName:  'organizations',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['slug'], name: 'organizations_slug_unique' },
    ],
  }
);

module.exports = Organization;
