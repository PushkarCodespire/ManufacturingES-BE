module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const MoldIssueReturn = sequelize.define('MoldIssueReturn', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    mold_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        isIn: [['issue', 'return']],
      },
    },
    work_order_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    machine_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    issued_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    returned_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    issue_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    return_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    storage_location_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    tableName: 'mold_issue_return',
    underscored: true,
    timestamps: true,
  });

  return MoldIssueReturn;
};
