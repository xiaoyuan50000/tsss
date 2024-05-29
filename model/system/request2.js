const { DataTypes } = require('sequelize');
const dbConf = require('../../db/dbConf_system');

module.exports.Request2 = dbConf.sequelizeSystemObj.define('request', {
    id: {
        type: DataTypes.STRING(11),
        primaryKey: true,
    },
    startDate: {
        type: DataTypes.STRING(50),
    },
    estimatedTripDuration: {
        type: DataTypes.STRING(20),
    },
    noOfTrips: {
        type: DataTypes.STRING(11),
    },
    additionalRemarks: {
        type: DataTypes.STRING(100),
    },
    createdBy: {
        type: DataTypes.BIGINT,
    },
    creatorRole: {
        type: DataTypes.STRING(45),
    },
    groupId: {
        type: DataTypes.BIGINT,
    },
    typeOfIndent: {
        type: DataTypes.STRING(100),
    },
    purposeType: {
        type: DataTypes.STRING(100),
    },
    poNumber: {
        type: DataTypes.STRING(100),
    },
    requestorName: {
        type: DataTypes.STRING(66),
    },
    trips: {
        type: DataTypes.VIRTUAL,
    },
    groupName: {
        type: DataTypes.VIRTUAL,
    },
}, {
    timestamps: true,
});