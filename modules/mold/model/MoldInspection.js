module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const MoldInspection = sequelize.define('MoldInspection', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    mold_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    issue_return_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    inspection_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['return', 'pre_issue', 'periodic']],
      },
    },
    parting_line: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: [['ok', 'wear', 'damage']],
      },
    },
    cavity_surface: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: [['ok', 'pitting', 'scratch']],
      },
    },
    ejector_pins: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: [['ok', 'bent', 'worn']],
      },
    },
    cooling_channels: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: [['ok', 'blocked', 'leaking']],
      },
    },
    flash_presence: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: [['none', 'minor', 'major']],
      },
    },
    overall_condition: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: [['good', 'fair', 'needs_repair']],
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    inspected_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    inspected_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'mold_inspections',
    underscored: true,
    timestamps: true,
  });

  return MoldInspection;
};
