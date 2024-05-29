const { DataTypes } = require('sequelize');
const dbConf = require('../../db/dbConf_system');

module.exports.NGTSReqAck = dbConf.sequelizeSystemObj.define('ngts_req_ack', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    referenceId: {
        type: DataTypes.STRING(23),
    },
    lineNumber: {
        type: DataTypes.STRING(16),
    },
    errorCode: {
        type: DataTypes.STRING(16),
    },
    errorMessage: {
        type: DataTypes.STRING(255),
    },
    fromFile: {
        type: DataTypes.STRING(50),
    },
    isSend: {
        type: DataTypes.STRING(1),
        defaultValue: 'N',
    }
}, {
    timestamps: true,
});