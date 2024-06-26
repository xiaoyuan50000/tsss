

const { Sequelize, Op, QueryTypes } = require('sequelize');
const { sequelizeServerObj } = require('../db/dbConf_server');
const log = require('../log/winston').logger('QNC ChildProcess');
const csvUtil = require('../util/csvUtil');
const { decodeAESCode } = require('../util/utils');
const { Prefix } = require('../util/content');
const { Group } = require('../model/system/group');


const sftpUtil = require('../util/sftpUtil');

process.on('message', async processParams => {
    try {

        let dateformat = csvUtil.getFileNameDateFormat(processParams.cron)
        await generateQNC(dateformat)
        
        process.send({ success: true })
    } catch (error) {
        log.error(error);
        process.send({ success: false, error })
    }
})


const generateQNC = async function (dateformat) {
    let unitCodeList = await Group.findAll()

    let filename = `NGTS_QNC_${dateformat}.csv`
    log.info(`\r\n`)
    log.info(`-------------------Start generate ${filename}-------------------`)
    let result = await sequelizeServerObj.query(
        `SELECT
            * 
        FROM
            (
            SELECT
                a.driverId,
                a.nric,
                a.permitStatus,
                b.vehicleType as permitType,
                c.ngtsId,
                'P' as type,
                DATE_FORMAT(b.lastApproveDate,'%Y%m%d') as dateFrom,
                DATE_FORMAT(a.operationallyReadyDate,'%Y%m%d') as dateTo,
                e.nric as approver,
                u.unit,
                a.groupId,
                ifnull(u.unit, a.groupId) as unitCode
            FROM
                driver a
                INNER JOIN driver_platform_conf b ON a.driverId = b.driverId and b.approveStatus = 'Approved'
                LEFT JOIN vehicle_category c on b.vehicleType = c.vehicleName
                LEFT JOIN user e on b.lastApproveBy = e.userId
                LEFT JOIN unit u on a.unitId = u.id
            UNION
            SELECT
                a.driverId,
                a.nric,
                a.permitStatus,
                c.permitType,
                c.ngtsId,
                'C' as type,
                DATE_FORMAT(b.createdAt,'%Y%m%d') as dateFrom,
                DATE_FORMAT(a.operationallyReadyDate,'%Y%m%d') as dateTo,
                e.nric as approver,
                u.unit,
                a.groupId,
                ifnull(u.unit, a.groupId) as unitCode
            FROM
                driver a
                INNER JOIN driver_permittype_detail b ON a.driverId = b.driverId
                LEFT JOIN permittype c ON b.permitType = c.permitType 
                LEFT JOIN user e on b.creator = e.userId
                LEFT JOIN unit u on a.unitId = u.id
            ) a 
            where a.nric is not null and a.unitCode is not null
            order by a.driverId;`,
        {
            type: QueryTypes.SELECT
        })

    let data = result.map(o => {
        let { nric, permitStatus, permitType, type, ngtsId, dateFrom, dateTo, approver, unit, groupId } = o
        nric = getNRIC(nric)
        approver = getNRIC(approver)
        let isValid = permitStatus == 'valid' ? 'A' : 'S'
        let unitCode = getUnitCode(unit, groupId, unitCodeList)
        return [
            nric,
            dateFrom,
            dateTo,
            approver,
            dateFrom,
            unitCode,
            isValid,
            ngtsId || '',
            type,
            permitType,
            'Q'
        ]
    })
    data.push([Prefix.Footer, data.length])
    let { code } = await csvUtil.write(filename, data)
    if (code == 1) {
        log.info(`\r\n`)
        log.info(`-------------------Start Upload ${filename}-------------------`)
        await sftpUtil.uploadFileToFTPServer(filename)
        log.info(`\r\n`)
        log.info(`-------------------End Upload ${filename}-------------------`)
    }

    log.info(`-------------------End generate ${filename}-------------------`)
    log.info(`\r\n`)
    return { code, filename }
}
module.exports.generateQNC = generateQNC

const getNRIC = function (data) {
    if (data && data.length > 9) {
        return decodeAESCode(data)
    }
    return data || ""
}

const getUnitCode = function (unit, groupId, unitCodeList) {
    if (!groupId) {
        return `${unit}`
    }

    let unitCode = unitCodeList.find(item => item.id == groupId)
    return unitCode ? unitCode.groupName : ""
}