
const log = require('../log/winston').logger('Vehicle ChildProcess');
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
        let filename = `NGTS_VEHICLE_${dateformat}.csv`
        log.info(`\r\n`)
        log.info(`-------------------Start Upload ${filename}-------------------`)


        let vehicleList = await NGTSVehicle.findAll()

        let data = vehicleList.map(o => [
            o.id,
            o.resourceType,
            o.group,
            o.serviceType,
            o.serviceMode,
            o.status,
            o.baseLineQty
        ])
        data.push([Prefix.Footer, data.length])
        let { code } = await csvUtil.write(filename, data)
        if (code == 1) {
            await sftpUtil.uploadFileToFTPServer(filename)
        }

        log.info(`-------------------End Upload ${filename}-------------------`)
        log.info(`\r\n`)

        process.send({ success: true })
    } catch (error) {
        log.error(error);
        process.send({ success: false, error })
    }
})


const generateVehicleFile = async function () {
    try {
        let dateformat = moment().format('YYYYMMDDHHmm')
        let filename = `NGTS_VEHICLE_${dateformat}.csv`
        log.info(`\r\n`)
        log.info(`-------------------Start generate ${filename}-------------------`)


        let vehicleList = await NGTSVehicle.findAll()

        let data = vehicleList.map(o => [
            o.id,
            o.resourceType,
            o.group,
            o.serviceType,
            o.serviceMode,
            o.status,
            o.baseLineQty
        ])
        data.push([Prefix.Footer, data.length])
        await csvUtil.write(filename, data)


        log.info(`-------------------End generate ${conf.SFTPLocalUploadPath + '/' + filename}-------------------`)
        log.info(`\r\n`)

    } catch (error) {
        log.error(error);
    }
}

// generateVehicleFile()