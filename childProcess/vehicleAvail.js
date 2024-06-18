
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
    try {
        let filename = `NGTS_VEHICLE_AVAIL_${dateformat}.csv`
        log.info(`\r\n`)
        log.info(`-------------------Start generate ${filename}-------------------`)

        const dateFrom = moment().format('YYYY0601')
        const dateTo = moment().add(1, 'y').format('YYYY0531')

        let vehicleList = await NGTSVehicle.findAll()
        let data = vehicleList.map(o => {
            const type = (o.status != 'A' || o.baseLineQty == 0) ? 'U' : 'M'
            return [
                o.id,
                type,
                dateFrom,
                dateTo,
                '',
                '',
                o.baseLineQty,
                ''
            ]
        })
        data.push([Prefix.Footer, data.length])
        let { code } = await csvUtil.write(filename, data)
        if (code == 1) {
            await sftpUtil.uploadFileToFTPServer(filename)
        }

        log.info(`-------------------End generate ${conf.SFTPLocalUploadPath + '/' + filename}-------------------`)
        log.info(`\r\n`)

    } catch (error) {
        log.error(error);
    }
}

// generateVehicleAvailFile(moment().format('YYYYMMDDHHmm'))