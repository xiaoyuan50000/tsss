
const log = require('../log/winston').logger('Vehicle Avail ChildProcess');
const csvUtil = require('../util/csvUtil');
const { Prefix } = require('../util/content');
const { NGTSVehicle } = require('../model/system/ngtsVehicle');
const { Sequelize, Op, QueryTypes } = require('sequelize');
const moment = require('moment')
const conf = require('../conf/conf.js');

const sftpUtil = require('../util/sftpUtil');

process.on('message', async processParams => {
    try {
        let dateformat = csvUtil.getFileNameDateFormat(processParams.cron)
        await generateVehicleAvailFile(dateformat)

        process.send({ success: true })
    } catch (error) {
        log.error(error);
        process.send({ success: false, error })
    }
})


const generateVehicleAvailFile = async function (dateformat) {

    let filename = `NGTS_VEHICLE_AVAIL_${dateformat}.csv`
    log.info(`\r\n`)
    log.info(`-------------------Start generate ${filename}-------------------`)

    let vehicleList = await NGTSVehicle.findAll({
        where: {
            status: {
                [Op.or]: ["A", "U"]
            }
        }
    })
    let data = vehicleList.map(o => {
        const type = (o.status == 'U' || o.baseLineQty == 0) ? 'U' : 'M'
        const periodFrom = type == 'U' ? 'A' : ''
        const periodTo = type == 'U' ? 'N' : ''
        const reason = type == 'U' ? o.unavailableReason : ''
        return [
            o.id,
            type,
            moment(o.dateFrom).format('YYYYMMDD'),
            moment(o.dateTo).format('YYYYMMDD'),
            periodFrom,
            periodTo,
            o.baseLineQty,
            reason
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

    log.info(`-------------------End generate ${conf.SFTPLocalUploadPath + '/' + filename}-------------------`)
    log.info(`\r\n`)
    return { code, filename }
}
module.exports.generateVehicleAvailFile = generateVehicleAvailFile

// generateVehicleAvailFile(moment().format('YYYYMMDDHHmm'))