module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const Mold = sequelize.define('Mold', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    mold_code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    serial_no: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    manufacturer: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    material: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    weight_kg: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    tonnage_req: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    platen_size: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    tie_bar_spacing: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    total_cavities: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    active_cavities: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    expected_life_shots: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    current_shot_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    owner_type: {
      type: DataTypes.STRING(20),
      defaultValue: 'company',
      validate: {
        isIn: [['company', 'customer']],
      },
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    purchase_cost: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true,
    },
    installation_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(30),
      defaultValue: 'registered',
      validate: {
        isIn: [['registered', 'trial_pending', 'production_ready', 'in_production', 'in_storage', 'repair_needed', 'in_repair', 'end_of_life', 'decommissioned']],
      },
    },
    life_stage: {
      type: DataTypes.STRING(30),
      defaultValue: 'normal',
      validate: {
        isIn: [['normal', 'plan_replacement', 'urgent_replacement', 'critical', 'end_of_life', 'extended_life']],
      },
    },
    storage_location_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    qr_code: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    nfc_tag_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    photo_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    tableName: 'molds',
    underscored: true,
    timestamps: true,
  });

  return Mold;
};
