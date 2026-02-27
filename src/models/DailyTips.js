const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DailyTip = sequelize.define('DailyTip', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tip: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    unique: true
  }
}, {
  tableName: 'daily_tips',
  timestamps: true
});

module.exports = DailyTip;