const {
  Mold, MoldCategory, MoldShotSummary, MoldLifeConfig, MoldIssueReturn,
  MoldInspection, MoldRepairRequest, MoldRepairType, MoldPmSchedule, MoldPmTemplate,
  MoldCost, User, Vendor,
} = require('../../../models');
const { generateReport } = require('../cred/moldDocuments.cred');

// GET /mold/documents/:moldId/history-card
const getMoldHistoryCard = async (req, res) => {
  try {
    const { moldId } = req.params;
    const mold = await Mold.findByPk(moldId, {
      include: [
        { model: MoldCategory,    as: 'Category' },
        { model: Vendor,          as: 'Customer',    attributes: ['id', 'name', 'partner_code'] },
        { model: MoldShotSummary, as: 'ShotSummary' },
        { model: MoldLifeConfig,  as: 'LifeConfig' },
        { model: User,            as: 'Creator',     attributes: ['id', 'name'] },
      ],
    });
    if (!mold) return res.status(404).json({ success: false, message: 'Mold not found' });

    const issueHistory = await MoldIssueReturn.findAll({
      where: { mold_id: moldId }, order: [['created_at', 'DESC']], limit: 20,
      include: [{ model: User, as: 'IssuedBy', attributes: ['id', 'name'] }],
    });
    const repairHistory = await MoldRepairRequest.findAll({
      where: { mold_id: moldId }, order: [['created_at', 'DESC']], limit: 10,
      include: [{ model: MoldRepairType, as: 'RepairType', attributes: ['id', 'name'] }],
    });
    const pmHistory = await MoldPmSchedule.findAll({
      where: { mold_id: moldId, status: 'completed' }, order: [['last_completed_at', 'DESC']], limit: 10,
      include: [{ model: MoldPmTemplate, as: 'Template', attributes: ['id', 'name'] }],
    });
    const costRecords = await MoldCost.findAll({ where: { mold_id: moldId }, order: [['incurred_date', 'DESC']] });
    const totalCost = costRecords.reduce((sum, c) => sum + parseFloat(c.amount), 0);

    return res.json({
      success: true,
      data: {
        mold, issueHistory, repairHistory, pmHistory,
        costSummary: { records: costRecords, totalCost },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[MoldDocuments.getMoldHistoryCard]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /mold/documents/:moldId/status-certificate
const getStatusCertificate = async (req, res) => {
  try {
    const { moldId } = req.params;
    const mold = await Mold.findByPk(moldId, {
      include: [
        { model: MoldCategory,    as: 'Category' },
        { model: MoldShotSummary, as: 'ShotSummary' },
        { model: MoldLifeConfig,  as: 'LifeConfig' },
      ],
    });
    if (!mold) return res.status(404).json({ success: false, message: 'Mold not found' });
    const lastInspection = await MoldInspection.findOne({
      where: { mold_id: moldId }, order: [['inspected_at', 'DESC']],
      include: [{ model: User, as: 'InspectedBy', attributes: ['id', 'name'] }],
    });
    const lastRepair = await MoldRepairRequest.findOne({
      where: { mold_id: moldId, status: 'completed' }, order: [['updated_at', 'DESC']],
    });
    const lifePercent = mold.ShotSummary && mold.expected_life_shots
      ? ((mold.current_shot_count / mold.expected_life_shots) * 100).toFixed(2)
      : null;
    return res.json({
      success: true,
      data: { mold, lastInspection, lastRepair, lifePercent, certificateDate: new Date().toISOString(), issuedBy: req.user?.id },
    });
  } catch (err) {
    console.error('[MoldDocuments.getStatusCertificate]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /mold/documents/report?report_type=
const generateFleetReport = async (req, res) => {
  try {
    const { error, value } = generateReport.validate(req.query);
    if (error) return res.status(400).json({ success: false, message: error.message });
    const molds = await Mold.findAll({
      where: { is_active: true },
      include: [
        { model: MoldCategory,    as: 'Category' },
        { model: MoldShotSummary, as: 'ShotSummary' },
        { model: MoldLifeConfig,  as: 'LifeConfig' },
      ],
      order: [['mold_code', 'ASC']],
    });
    return res.json({
      success: true,
      data: {
        report_type: value.report_type, generated_at: new Date().toISOString(),
        generated_by: req.user?.id, total_molds: molds.length, molds,
      },
    });
  } catch (err) {
    console.error('[MoldDocuments.generateFleetReport]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getMoldHistoryCard, getStatusCertificate, generateFleetReport };
