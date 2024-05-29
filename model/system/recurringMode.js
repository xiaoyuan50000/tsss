const { DataTypes } = require('sequelize');
const dbConf = require('../../db/dbConf_system');

module.exports.RecurringMode = dbConf.sequelizeSystemObj.define('recurring_mode', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    service_mode_value: {
        type: DataTypes.STRING(100),
    },
    value: {
        type: DataTypes.STRING(100),
    },
}, {
    timestamps: false,
});