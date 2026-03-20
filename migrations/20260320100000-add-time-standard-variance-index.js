'use strict';

/** Batch 1A — adds composite index on job_cards for fast time-standard variance queries */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('job_cards', ['routing_step_id', 'status'], {
      name: 'job_cards_routing_step_status_idx',
      where: { routing_step_id: { [Symbol.for('ne')]: null } },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('job_cards', 'job_cards_routing_step_status_idx');
  },
};
