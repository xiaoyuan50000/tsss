const { DataTypes } = require('sequelize');
const dbConf = require('../../db/dbConf_system');

module.exports.ServiceType = dbConf.sequelizeSystemObj.define('service_type', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING(100),
    },
    category: {
        type: DataTypes.STRING(100),
    },
    disableWallet: {
        type: DataTypes.BOOLEAN()
    }
}, {
    timestamps: false,
});