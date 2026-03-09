'use strict';

/**
 * Migration: 20260306120000-add-token-invalidated-at-to-users
 *
 * Adds token_invalidated_at to the users table.
 * When an admin updates a user's permissions, this timestamp is set to NOW().
 * The authenticate middleware and refresh handler compare the token's iat
 * against this value — any token issued BEFORE this timestamp is rejected,
 * forcing the affected user to re-authenticate immediately.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'token_invalidated_at', {
      type:      Sequelize.DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: 'Set when permissions are updated; tokens issued before this time are rejected',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'token_invalidated_at');
  },
};
