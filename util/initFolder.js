const fs = require('fs');
const path = require('path');
const log = require('../log/winston').logger('Init Folder');

const { SFTPLocalDownloadPath, SFTPLocalUploadPath } = require('../conf/conf.js');

const InitFolder = function () {
    let folders = [SFTPLocalDownloadPath, SFTPLocalUploadPath]
    for (let folder of folders) {
        if (!fs.existsSync(folder)) {
            fs.mkdir(path.resolve(folder), { recursive: true }, (err) => {
                if (err) {
                    log.error(err)
                }
                log.info(`mkdir ${folder}`)
            });
        }
    }
}
InitFolder()