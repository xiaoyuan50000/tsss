const log = require('../log/winston').logger('CSV Util');
const fs = require('fs');
const fastCsv = require('fast-csv');
const conf = require('../conf/conf.js');
const { CSV } = require('../util/content');

const path = require('path');
const moment = require('moment');


const SFTPLocalUploadPath = conf.SFTPLocalUploadPath


module.exports.write = async function (filename, data) {
    return new Promise((resolve, reject) => {
        let filePath = path.resolve(SFTPLocalUploadPath, filename)
        const writeStream = fs.createWriteStream(filePath);
        
        let csvConfig = {
            headers: false,
            delimiter: CSV.Separator,
            rowDelimiter: CSV.RowDelimiter,
        }
        fastCsv.writeToStream(writeStream, data, csvConfig)
            .on('finish', () => {
                log.info('CSV file has been written successfully.');
                resolve({ code: 1 })
            })
            .on('error', (error) => {
                log.error('Error writing CSV file:', error);
                resolve({ code: 0 })
            });
    })
}

module.exports.read = function (filePath, customHeaders = false) {
    return new Promise((resolve, reject) => {
        let datas = []
        log.info(`Read CSV file: ${filePath}`)
        const readStream = fs.createReadStream(filePath);

        let csvConfig = {
            headers: customHeaders,
            delimiter: CSV.Separator,
            rowDelimiter: CSV.RowDelimiter,
        }

        readStream.pipe(fastCsv.parse(csvConfig))
            .on('data', (row) => {
                // log.info(JSON.stringify(row,null,2));
                datas.push(row)
            })
            .on('end', () => {
                log.info('CSV file has been read successfully.');
                resolve({ code: 1, data: datas })
            })
            .on('error', (error) => {
                log.error('Error reading CSV file:', error);
                resolve({ code: 0, data: datas })
            });
    })
}

module.exports.getFileNameDateFormat = function (cron) {
    let arr = cron.split(' ')
    const now = moment();
    const year = now.year();
    const month = now.month();
    const day = now.date();
    let date = new Date(year, month, day, arr[2], arr[1])
    return moment(date).format(`YYYYMMDDHHmm`)
}