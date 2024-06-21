const { DataTypes } = require('sequelize');
const dbConf = require('../../db/dbConf_system');

module.exports.NGTSVehicle = dbConf.sequelizeSystemObj.define('ngts_vehicle', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    resourceType: {
        type: DataTypes.STRING(255),
    },
    group: {
        type: DataTypes.STRING(1),
    },
    serviceTypeId: {
        type: DataTypes.BIGINT,
    },
    serviceType: {
        type: DataTypes.STRING(50),
    },
    serviceModeId: {
        type: DataTypes.BIGINT,
    },
    serviceMode: {
        type: DataTypes.STRING(50),
    },
    serviceModeValue: {
        type: DataTypes.STRING(255),
    },
    status: {
        type: DataTypes.STRING(1),
    },
    baseLineQty: {
        type: DataTypes.INTEGER(4),
    },
    dateFrom: {
        type: DataTypes.DATEONLY,
    },
    dateTo: {
        type: DataTypes.DATEONLY,
    },
    unavailableReason: {
        type: DataTypes.STRING(255),
    },
}, {
    timestamps: false,
});