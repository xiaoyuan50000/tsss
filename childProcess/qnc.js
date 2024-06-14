

const { Sequelize, Op, QueryTypes } = require('sequelize');
const { sequelizeServerObj } = require('../db/dbConf_server');
const log = require('../log/winston').logger('QNC ChildProcess');
const csvUtil = require('../util/csvUtil');
const { decodeAESCode } = require('../util/utils');
const { Prefix } = require('../util/content');


const sftpUtil = require('../util/sftpUtil');

process.on('message', async processParams => {
    try {
        let dateformat = csvUtil.getFileNameDateFormat(processParams.cron)
        let filename = `NGTS_QNC_${dateformat}.csv`
        log.info(`\r\n`)
        log.info(`-------------------Start Upload ${filename}-------------------`)

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
                    0 as ngtsId,
                    'P' as type
                FROM
                    driver a
                    INNER JOIN driver_platform_conf b ON a.driverId = b.driverId and b.approveStatus = 'Approved'
                UNION
                SELECT
                    a.driverId,
                    a.nric,
                    a.permitStatus,
                    c.permitType,
                    c.ngtsId,
                    'C' as type
                FROM
                    driver a
                    INNER JOIN driver_permittype_detail b ON a.driverId = b.driverId
                    LEFT JOIN permittype c ON b.permitType = c.permitType 
                ) a 
                where a.nric is not null
                order by a.driverId`,
            {
                type: QueryTypes.SELECT
            })

        let data = result.map(o => {
            let { nric, permitStatus, permitType, type, ngtsId } = o
            if (nric.length > 9) {
                nric = decodeAESCode(nric)
            }
            let isValid = permitStatus == 'valid' ? 'A' : 'S'
            return [
                nric,
                '',
                '',
                '',
                '',
                '',
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
            await sftpUtil.uploadFileToFTPServer(filename)
        }

        log.info(`\r\n`)
        log.info(`-------------------End Upload ${filename}-------------------`)

        process.send({ success: true })
    } catch (error) {
        log.error(error);
        process.send({ success: false, error })
    }
})