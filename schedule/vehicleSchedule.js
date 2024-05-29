const schedule = require('node-schedule');
const { fork } = require('child_process')
const moment = require('moment');
const conf = require('../conf/conf.js');
const text = `VEHICLE Schedule`
const log = require('../log/winston').logger(text);



module.exports.vehicleScheduleStart = function () {

    for (let cron of conf.scheduleCron.NGTS_VEHICLE) {
        log.info(`Init ${text}: cron: ${cron} `);

        schedule.scheduleJob(text, cron, async () => {
            log.info(`(${text} ${moment().format('YYYY-MM-DD HH:mm:ss')} ): start working!`);
            const childProcess = fork('./childProcess/vehicle.js')
            childProcess.on('message', async msg => {
                log.info(`(${text} ${moment().format('YYYY-MM-DD HH:mm:ss')} ): finish working!`);
                childProcess.disconnect();
            })
            childProcess.send({cron})
        })
    }
}