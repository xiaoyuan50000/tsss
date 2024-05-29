const Client = require('ssh2-sftp-client')
const conf = require('../conf/conf.js');
const log = require('../log/winston').logger('SFTP Util');
const path = require('path');

const romotePath_in = conf.SFTPRemotePath.in
const romotePath_out = conf.SFTPRemotePath.out

const SFTPLocalDownloadPath = conf.SFTPLocalDownloadPath
const SFTPLocalUploadPath = conf.SFTPLocalUploadPath

const TestConnectSFTPServer = async function () {
    let sftp = null
    try {
        sftp = new Client();
        log.info(`Test Connent to SFTP Server: ${JSON.stringify(conf.SFTPConf, null, 2)}`)
        await sftp.connect(conf.SFTPConf)
        log.info(`Test Connent to SFTP Server successfully!`)
    } catch (ex) {
        log.error(`Connection to SFTP failed!`)
        throw new Error(`Connection to SFTP failed!`)
    } finally {
        if (sftp) {
            await sftp.end();
        }
    }
}
module.exports.TestConnectSFTPServer = TestConnectSFTPServer

const connectSFTPServer = async function () {
    let sftp = new Client();
    await sftp.connect(conf.SFTPConf)
    log.info(`Connent to SFTP Server: ${JSON.stringify(conf.SFTPConf, null, 2)}`)
    return sftp
}

const listFileFormFTPServer = async function () {
    log.info(`List from SFTP Server, romotePath: ${romotePath_out}`)
    let sftp = null
    let fileList = []
    try {
        sftp = await connectSFTPServer()

        let files = await sftp.list(romotePath_out);
        log.info(`Get files length: ${files.length}`)

        for (let file of files) {
            let filename = file.name
            log.info(`Get file name: ${filename}, size: ${file.size}`)
            let targetFile = path.join(romotePath_out, filename)
            let dstFile = path.join(SFTPLocalDownloadPath, filename)
            await sftp.fastGet(targetFile, dstFile);

            fileList.push(dstFile)
        }

        log.info(`List from SFTP Server Success`)
        return { code: 1, err: '', data: fileList }
    } catch (ex) {
        log.error(`List File Form SFTP Server, err: ${ex}`)
        return { code: 0, err: ex, data: fileList }
    } finally {
        if (sftp) {
            await sftp.end();
        }
    }
}
module.exports.listFileFormFTPServer = listFileFormFTPServer


const putFilesToSFTPServer = async function (filenameArr) {
    let sftp = null
    try {
        sftp = await connectSFTPServer()

        log.info(`Put files to SFTP Server, romotePath: ${romotePath_in}`)

        for (let filename of filenameArr) {
            let filePath = path.join(SFTPLocalUploadPath, filename)
            log.info(`Put file to SFTP Server, localPath: ${filePath}`)

            let targetFile = path.join(romotePath_in, filename)
            await sftp.fastPut(filePath, targetFile);
        }
        log.info(`Put files to SFTP Server Success`)
        return { code: 1, err: '' }
    } catch (ex) {
        log.error(`Put files to SFTP Server, err: ${ex}`)
        return { code: 0, err: ex }
    } finally {
        if (sftp) {
            await sftp.end();
        }
    }
}
module.exports.putFilesToSFTPServer = putFilesToSFTPServer

const uploadFileToFTPServer = async function (filename) {
    let filePath = path.join(SFTPLocalUploadPath, filename)
    let uploadFiles = [filePath]
    log.info(`Put file to SFTP Server, localPath: ${filePath}`)
    log.info(`Put file to SFTP Server, romotePath: ${romotePath_in}`)
    let sftp = null
    try {
        sftp = await connectSFTPServer()

        for (let file of uploadFiles) {
            let filename = path.basename(file)
            let targetFile = path.join(romotePath_in, filename)
            await sftp.fastPut(file, targetFile);
        }
        log.info(`Put file to SFTP Server Success`)
        return { code: 1, err: '' }
    } catch (ex) {
        log.error(`Put file to SFTP Server, err: ${ex}`)
        return { code: 0, err: ex }
    } finally {
        if (sftp) {
            await sftp.end();
        }
    }
}
module.exports.uploadFileToFTPServer = uploadFileToFTPServer


function getFilesInFolder(folderPath) {
    const files = fs.readdirSync(folderPath);
    return files.map(file => {
        let filePath = path.join(folderPath, file)
        log.info(`${filePath}`)
        return filePath
    });
}