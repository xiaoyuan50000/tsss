const { DataTypes } = require('sequelize');
const dbConf = require('../../db/dbConf_system');

module.exports.PurposeServiceType = dbConf.sequelizeSystemObj.define('purpose_service_type', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    purposeId: {
        type: DataTypes.BIGINT,
    },
    serviceTypeId: {
        type: DataTypes.STRING(255),
    },
    isMandatory: {
        type: DataTypes.BOOLEAN,
    },
    funding: {
        type: DataTypes.STRING(10),
    }
}, {
    timestamps: false,
});