
const log = require('../log/winston').logger('Location ChildProcess');
const { Prefix } = require('../util/content');
const csvUtil = require('../util/csvUtil');

const { Location } = require('../model/system/location');


const sftpUtil = require('../util/sftpUtil');

process.on('message', async processParams => {
    try {
        let dateformat = csvUtil.getFileNameDateFormat(processParams.cron)
        let filename = `NGTS_LOCATION_${dateformat}.csv`
        log.info(`\r\n`)
        log.info(`-------------------Start Upload ${filename}-------------------`)


        let locationList = await Location.findAll()
        let data = locationList.map(o => [o.id, o.locationName.replace(/\r?\n/g, ''), (o.belongTo && o.belongTo.toUpperCase() == 'ATMS') ? 'A' : 'D'])
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