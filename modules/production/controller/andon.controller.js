const { Op } = require('sequelize');
const db = require('../../../models');

// ── GET /production/andon/alerts ───────────────────────────────────────────
const getAlerts = async (req, res) => {
  try {
    const { status, machine_id, alert_type } = req.query;
    const where = {};
    if (status)     where.status     = status;
    if (machine_id) where.machine_id = machine_id;
    if (alert_type) where.alert_type = alert_type;

    const alerts = await db.AndonAlert.findAll({
      where,
      include: [
        { model: db.Machine, as: 'machine', attributes: ['id', 'name', 'code'] },
        { model: db.User, as: 'raisedBy', attributes: ['id', 'name', 'employee_id'] },
        { model: db.User, as: 'acknowledgedBy', attributes: ['id', 'name', 'employee_id'] },
      ],
      order: [['created_at', 'DESC']],
    });
    return res.json({ success: true, data: alerts });
  } catch (err) {
    console.error('[Andon.getAlerts]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /production/andon/alerts ──────────────────────────────────────────
const raiseAlert = async (req, res) => {
  try {
    const { machine_id, alert_type, work_order_id, notes, site_id } = req.body;
    if (!alert_type) {
      return res.status(400).json({ success: false, message: 'alert_type is required' });
    }

    const alert = await db.AndonAlert.create({
      machine_id:    machine_id    || null,
      work_order_id: work_order_id || null,
      site_id:       site_id       || null,
      alert_type,
      notes:    notes || null,
      raised_by: req.user?.id || null,
      status:   'open',
    });

    // If machine_down, create a BreakdownRequest
    if (alert_type === 'machine_down' && machine_id) {
      try {
        // Find equipment linked to machine (best-effort)
        const equipment = await db.Equipment.findOne({
          where: { machine_id },
        }).catch(() => null);

        if (equipment) {
          const br = await db.BreakdownRequest.create({
            equipment_id:  equipment.id,
            symptoms:      notes || 'Machine down — raised via Andon alert',
            reported_by:   req.user?.id || null,
            status:        'open',
          }).catch(() => null);

          if (br) {
            await alert.update({ breakdown_request_id: br.id });
          }
        }
      } catch (e) {
        console.warn('[Andon.raiseAlert] BreakdownRequest creation non-fatal:', e.message);
      }
    }

    // Get machine name for notifications
    let machineName = 'Unknown';
    if (machine_id) {
      const machine = await db.Machine.findByPk(machine_id, { attributes: ['name'] }).catch(() => null);
      if (machine) machineName = machine.name;
    }

    // Send notifications
    try {
      const { Op: OpN } = require('sequelize');
      const notifyRoles = ['production_manager','production_incharge','maintenance_incharge','it_admin'];
      const usersToNotify = await db.User.findAll({
        include: [{ model: db.Role, as: 'Role', where: { name: { [OpN.in]: notifyRoles } }, required: true }],
        attributes: ['id'],
      });
      for (const u of usersToNotify) {
        await db.Notification.create({
          user_id: u.id,
          type: 'andon_alert',
          title: `Andon Alert: ${alert_type.replace(/_/g,' ').toUpperCase()}`,
          message: `Machine ${machineName} raised an alert: ${alert_type}`,
          metadata: { andon_alert_id: alert.id, machine_id },
        }).catch(() => {});
      }
    } catch (e) {}

    return res.status(201).json({ success: true, data: alert });
  } catch (err) {
    console.error('[Andon.raiseAlert]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /production/andon/alerts/:id/acknowledge ────────────────────────
const acknowledgeAlert = async (req, res) => {
  try {
    const alert = await db.AndonAlert.findByPk(req.params.id);
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
    if (alert.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Alert is not in open status' });
    }

    const now = new Date();
    const response_time_min = alert.created_at
      ? Math.round((now - new Date(alert.created_at)) / 60000)
      : null;

    await alert.update({
      status: 'acknowledged',
      acknowledged_by: req.user?.id || null,
      acknowledged_at: now,
      response_time_min,
    });

    return res.json({ success: true, data: alert });
  } catch (err) {
    console.error('[Andon.acknowledgeAlert]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PATCH /production/andon/alerts/:id/resolve ────────────────────────────
const resolveAlert = async (req, res) => {
  try {
    const alert = await db.AndonAlert.findByPk(req.params.id);
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
    if (alert.status === 'resolved') {
      return res.status(400).json({ success: false, message: 'Alert is already resolved' });
    }

    const { notes } = req.body;
    await alert.update({
      status: 'resolved',
      resolved_at: new Date(),
      notes: notes || alert.notes,
    });

    return res.json({ success: true, data: alert });
  } catch (err) {
    console.error('[Andon.resolveAlert]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /production/andon/board ───────────────────────────────────────────
const getBoard = async (req, res) => {
  try {
    // Get all active machines with their current alert state
    const machines = await db.Machine.findAll({
      where: { status: 'active' },
      attributes: ['id', 'name', 'code', 'machine_type'],
      order: [['name', 'ASC']],
    }).catch(() => []);

    const board = await Promise.all(
      machines.map(async (machine) => {
        const activeAlert = await db.AndonAlert.findOne({
          where: {
            machine_id: machine.id,
            status: { [Op.in]: ['open', 'acknowledged'] },
          },
          include: [
            { model: db.User, as: 'raisedBy', attributes: ['id', 'name'] },
          ],
          order: [['created_at', 'DESC']],
        }).catch(() => null);

        // Find current WO
        const activeWO = await db.WorkOrder.findOne({
          where: {
            machine_id: machine.id,
            status: { [Op.in]: ['in_progress', 'released'] },
          },
          attributes: ['id', 'wo_no', 'status'],
          order: [['updated_at', 'DESC']],
        }).catch(() => null);

        return {
          machine_id: machine.id,
          machine_name: machine.name,
          machine_code: machine.code,
          machine_type: machine.machine_type,
          current_wo: activeWO ? { id: activeWO.id, wo_no: activeWO.wo_no } : null,
          alert: activeAlert,
          alert_status: activeAlert ? activeAlert.status : null,
          alert_type: activeAlert ? activeAlert.alert_type : null,
          board_status: activeAlert
            ? (activeAlert.status === 'open' ? 'alert' : 'acknowledged')
            : (activeWO ? 'running' : 'idle'),
        };
      })
    );

    return res.json({ success: true, data: board });
  } catch (err) {
    console.error('[Andon.getBoard]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAlerts, raiseAlert, acknowledgeAlert, resolveAlert, getBoard };
