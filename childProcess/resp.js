
const log = require('../log/winston').logger('RESP ChildProcess');
const csvUtil = require('../util/csvUtil');

const reqAckService = require('../services/reqAckService');

const sftpUtil = require('../util/sftpUtil');


process.on('message', async processParams => {
    try {
        let dateformat = csvUtil.getFileNameDateFormat(processParams.cron)
        let respFile = await reqAckService.SaveRespFile(dateformat)

        let { code } = await sftpUtil.uploadFileToFTPServer(respFile)
        if (code == 1) {
            await reqAckService.updateRespSendData()
        }
        process.send({ success: true })

    } catch (error) {
        log.error(error);
        process.send({ success: false, error })
    }
})