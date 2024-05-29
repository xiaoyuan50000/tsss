

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
                a.driverId,
                a.driverName,
                a.nric,
                a.isValid,
                b.id AS permitTypeDetailId,
                c.id AS platformId
            FROM
                (
                    SELECT driverId, driverName,nric, 'A' as isValid FROM driver 
                UNION
                SELECT driverId, driverName,nric, 'S' as isValid from driver_history
            ) a
            LEFT JOIN driver_permittype_detail b ON a.driverId = b.driverId
            LEFT JOIN driver_platform_conf c ON a.driverId = c.driverId
            GROUP BY
                a.driverId`,
            {
                type: QueryTypes.SELECT
            })

        let data = result.map(o => {
            let { driverId, driverName, nric, isValid, permitTypeDetailId, platformId } = o
            if (nric.length > 9) {
                nric = decodeAESCode(nric)
            }
            let permitType = ''
            if (permitTypeDetailId && !platformId) {
                permitType = 'C'
            } else if (!permitTypeDetailId && platformId || permitTypeDetailId && platformId) {
                permitType = 'P'
            }
            return [
                nric,
                '',
                '',
                '',
                '',
                '',
                isValid,
                0,
                permitType,
                '',
                ''
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