
const log = require('../log/winston').logger('Vehicle ChildProcess');
const csvUtil = require('../util/csvUtil');
const { Prefix } = require('../util/content');
const { NGTSVehicle } = require('../model/system/ngtsVehicle');
const { Sequelize, Op, QueryTypes } = require('sequelize');
const moment = require('moment')
const conf = require('../conf/conf.js');
const fs = require('fs');
const path = require('path');

const sftpUtil = require('../util/sftpUtil');

process.on('message', async processParams => {
    try {
        let dateformat = csvUtil.getFileNameDateFormat(processParams.cron)
        await generateVehicleFile(dateformat, true)

        process.send({ success: true })
    } catch (error) {
        log.error(error);
        process.send({ success: false, error })
    }
})

const readVehicleConf = function () {
    const cmd = process.cwd()
    const configPath = path.join(cmd, '/conf/vehicleConf.json')
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return configData
}

const rewriteVehicleConf = function (configData, verify) {
    if (!verify) {
        return
    }

    let { nextUploadDate, frequency } = configData
    let newNextUploadDate = moment(nextUploadDate).add(frequency, 'month').format("YYYY-MM")

    let newConf = { "nextUploadDate": newNextUploadDate, "frequency": frequency }

    const cmd = process.cwd()
    const configPath = path.join(cmd, '/conf/vehicleConf.json')
    fs.writeFile(configPath, JSON.stringify(newConf), 'utf8', (err) => {
        if (err) {
            log.error(err)
        } else {
            log.info(`vehicleConf.json file modified successfully.`)
        }
    });
}

const validSatisfyExecConditions = function (configData, verify) {
    if (!verify) {
        return true
    }

    let { nextUploadDate } = configData
    log.info(`Next Upload Date: ${nextUploadDate}, Current Date: ${moment().format("YYYY-MM")}`)
    log.info(`NGTS_VEHICLE Satisfy Exec: ${moment().format("YYYY-MM") == nextUploadDate}`)
    return moment().format("YYYY-MM") == nextUploadDate
}

const generateVehicleFile = async function (dateformat, verifyDate = false) {
    let configData = readVehicleConf()
    if (!validSatisfyExecConditions(configData, verifyDate)) {
        return
    }

    let filename = `NGTS_VEHICLE_${dateformat}.csv`
    log.info(`\r\n`)
    log.info(`-------------------Start generate ${filename}-------------------`)

    let vehicleList = await NGTSVehicle.findAll({
        where: {
            status: 'A'
        }
    })

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
        log.info(`-------------------Start Upload ${filename}-------------------`)
        await sftpUtil.uploadFileToFTPServer(filename)
        log.info(`-------------------End Upload ${filename}-------------------`)
    }
    rewriteVehicleConf(configData, verifyDate)

    log.info(`-------------------End generate ${conf.SFTPLocalUploadPath + '/' + filename}-------------------`)
    log.info(`\r\n`)
    return { code, filename }
}
module.exports.generateVehicleFile = generateVehicleFile

// generateVehicleFile(moment().format('YYYYMMDDHHmm'))