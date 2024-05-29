const Client = require('ftp')
const conf = require('../conf/conf.js');
const log = require('../log/winston').logger('FTP Util');
const fs = require('fs');
const path = require('path');


const romotePath_in = conf.SFTPRemotePath.in
const romotePath_out = conf.SFTPRemotePath.out

const SFTPLocalDownloadPath = conf.SFTPLocalDownloadPath
const SFTPLocalUploadPath = conf.SFTPLocalUploadPath
const SFTPConf = {
    host: conf.SFTPConf.host,
    port: conf.SFTPConf.port,
    user: conf.SFTPConf.username,
    password: conf.SFTPConf.password,
    keepalive: 1000,
    pasvTimeout: 100,
}

const list = async function (ftp) {
    return new Promise((resolve, reject) => {
        ftp.list(function (err, files) {
            resolve({ err: err, files: files })
        })
    })
}

const cwd = async function (ftp, path) {
    return new Promise((resolve, reject) => {
        ftp.cwd(path, function (err, dir) {
            resolve({ err: err, dir: dir })
        })
    })
}

const get = async function (ftp, filename) {
    return new Promise((resolve, reject) => {
        let filePath = path.join(SFTPLocalDownloadPath, filename)
        ftp.get(filename, function (err, rs) {
            let ws = fs.createWriteStream(filePath)
            rs.pipe(ws)
            resolve({ err: err, filePath: filePath })
        })
    })
}

const put = async function (ftp, currentFile) {
    let filename = path.basename(currentFile)
    let rs = fs.createReadStream(currentFile)
    return new Promise((resolve, reject) => {
        ftp.put(rs, filename, function (err) {
            resolve({ err: err })
        })
    })
}

const listFileFormFTPServer = async function (callback) {
    return new Promise((resolve, reject) => {
        let fileList = []

        log.info(`List from FTP Server, romotePath: ${romotePath_out}`)
        let ftp = new Client();
        log.info(`Connent FTP Server: ${JSON.stringify(SFTPConf, null, 2)}`)
        ftp.connect(SFTPConf)

        ftp.on('ready', async function () {
            log.info(`List from FTP Server ready`)

            let { err: cwdErr, dir } = await cwd(ftp, romotePath_out)
            if (cwdErr) {
                ftp.end()
                log.error(`List from FTP, cwdErr: ${cwdErr}`)
                return resolve({ code: 0, err: cwdErr, data: fileList })
            }

            let { err: listErr, files } = await list(ftp)
            if (listErr) {
                ftp.end()
                log.error(`List from FTP, listErr: ${cwdErr}`)
                return resolve({ code: 0, err: listErr, data: fileList })
            }

            log.info(`Get files length: ${files.length}`)
            for (let file of files) {
                log.info(`Get file name: ${file.name}, size: ${file.size}`)
                let { filePath } = await get(ftp, file.name)

                fileList.push(filePath)
            }
            ftp.end()
            log.info(`Close FTP Server: ${SFTPConf.host}`)

            resolve({ code: 1, err: '', data: fileList })
        })
    })
}
module.exports.listFileFormFTPServer = listFileFormFTPServer

const uploadFilesToFTPServer = async function () {
    return new Promise((resolve, reject) => {
        let uploadFiles = getFilesInFolder(SFTPLocalUploadPath)
        if (uploadFiles.length == 0) {
            resolve({ code: 1, err: '' })
        }

        log.info(`Upload files to FTP Server, romotePath: ${romotePath_in}`)
        let ftp = new Client();
        log.info(`Connent FTP Server: ${JSON.stringify(SFTPConf, null, 2)}`)
        ftp.connect(SFTPConf)

        ftp.on('ready', async function () {
            log.info(`Upload files to FTP Server ready`)

            let { err: cwdErr } = await cwd(ftp, romotePath_in)
            if (cwdErr) {
                ftp.end()
                log.error(`Upload files, cwdErr: ${cwdErr}`)
                resolve({ code: 0, err: cwdErr })
            }

            let successFiles = []
            for (let file of uploadFiles) {
                let { err } = await put(ftp, file)
                if (err) {
                    log.error(`Upload files: ${file}, err: ${err}`)
                } else {
                    successFiles.push(file)
                }
            }
            ftp.end()

            log.info(`Finnish upload files to FTP Server`)
            log.info(`Number of files to be uploaded: ${uploadFiles.length}`)
            log.info(`Number of successfully uploaded files: ${successFiles.length}`)
            log.info(`Close FTP Server: ${SFTPConf.host}`)

            resolve({ code: 1, err: '' })
        })
    })
}
module.exports.uploadFilesToFTPServer = uploadFilesToFTPServer


const uploadFileToFTPServer = async function (filename) {

    return new Promise((resolve, reject) => {
        let filePath = path.join(SFTPLocalUploadPath, filename)
        let uploadFiles = [filePath]
        log.info(`Upload file to FTP Server, localPath: ${filePath}`)
        log.info(`Upload file to FTP Server, romotePath: ${romotePath_in}`)
        let ftp = new Client();
        log.info(`Connent FTP Server: ${JSON.stringify(SFTPConf, null, 2)}`)
        ftp.connect(SFTPConf)

        ftp.on('ready', async function () {
            log.info(`Upload file to FTP Server ready`)

            let { err: cwdErr } = await cwd(ftp, romotePath_in)
            if (cwdErr) {
                ftp.end()
                log.error(`Upload file, cwdErr: ${cwdErr}`)
                resolve({ code: 0, err: cwdErr })
            }

            let successFiles = []
            for (let file of uploadFiles) {
                let { err } = await put(ftp, file)
                if (err) {
                    log.error(`Upload file: ${file}, err: ${err}`)
                } else {
                    successFiles.push(file)
                }
            }
            ftp.end()

            log.info(`Finnish upload files to FTP Server`)
            log.info(`Number of files to be uploaded: ${uploadFiles.length}`)
            log.info(`Number of successfully uploaded files: ${successFiles.length}`)
            log.info(`Close FTP Server: ${SFTPConf.host}`)

            resolve({ code: 1, err: '' })
        })
    })
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