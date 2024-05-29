const schedule = require('node-schedule');
const { fork } = require('child_process')
const moment = require('moment');
const conf = require('../conf/conf.js');
const text = `REQ ACK Schedule`
const log = require('../log/winston').logger(text);



module.exports.reqACKScheduleStart = function () {

    for (let cron of conf.scheduleCron.NGTS_REQ_ACK) {
        log.info(`Init ${text}: cron: ${cron} `);

        schedule.scheduleJob(text, cron, async () => {
            log.info(`(${text} ${moment().format('YYYY-MM-DD HH:mm:ss')} ): start working!`);
            const childProcess = fork('./childProcess/reqAck.js')
            childProcess.on('message', async msg => {
                log.info(`(${text} ${moment().format('YYYY-MM-DD HH:mm:ss')} ): finish working!`);
                childProcess.disconnect();
            })
            childProcess.send({cron})
        })
    }
}

