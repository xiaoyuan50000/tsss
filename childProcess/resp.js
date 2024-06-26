
const log = require('../log/winston').logger('RESP ChildProcess');
const csvUtil = require('../util/csvUtil');

const reqAckService = require('../services/reqAckService');

const sftpUtil = require('../util/sftpUtil');


process.on('message', async processParams => {
    try {
        let dateformat = csvUtil.getFileNameDateFormat(processParams.cron)
        await generateRespFile(dateformat)
        process.send({ success: true })

    } catch (error) {
        log.error(error);
        process.send({ success: false, error })
    }
})

const generateRespFile = async function (dateformat) {
    log.info(`\r\n`)
    let { code, filename } = await reqAckService.SaveRespFile(dateformat)

    if (code == 1) {
        log.info(`\r\n`)
        log.info(`-------------------Start Upload ${filename}-------------------`)
        await sftpUtil.uploadFileToFTPServer(filename)
        log.info(`-------------------End Upload ${filename}-------------------`)
        log.info(`\r\n`)
        await reqAckService.updateRespSendData()
    }
    return { code, filename }
}
module.exports.generateRespFile = generateRespFile