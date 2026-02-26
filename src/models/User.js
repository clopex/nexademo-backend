const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  fullName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isPremium: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  gender: {
  type: DataTypes.STRING,
  allowNull: true,
  defaultValue: null
},
phone: {
  type: DataTypes.STRING,
  allowNull: true,
  defaultValue: null
},
country: {
  type: DataTypes.STRING,
  allowNull: true,
  defaultValue: null
},
city: {
  type: DataTypes.STRING,
  allowNull: true,
  defaultValue: null
},
address: {
  type: DataTypes.STRING,
  allowNull: true,
  defaultValue: null
},
  profilePicture: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null
  },
  googleId: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null
  },
  appleId: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null
  },
}, {
  tableName: 'users',
  timestamps: true
});

module.exports = User;