const log = require('../log/winston').logger('utils');
const moment = require('moment');
const crypto = require('crypto');
const axios = require('axios')
const conf = require('../conf/conf')
const systemConf = require('../conf/systemConf');
const path = require('path')

module.exports.wait = async function (time) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, time);
    });
};

const decodeAESCode = function (str) {
    const deciper = crypto.createDecipheriv('aes128', systemConf.aesKey, systemConf.aesIv);
    let descrped = deciper.update(str, 'hex', 'utf8');
    descrped += deciper.final('utf8')
    return descrped;
}
module.exports.decodeAESCode = decodeAESCode


const { v4: uuidv4 } = require('uuid');
const chars36 = ["A", "B", "C", "D", "E", "F",
    "G", "H", "I", "J", "K", "L",
    "M", "N", "O", "P", "Q", "R",
    "S", "T", "U", "V", "W", "X",
    "Y", "Z", "0", "1", "2", "3",
    "4", "5", "6", "7", "8", "9"]
const GenerateIndentID = function () {
    let uuid = uuidv4().split('-').join('0');
    let sixChar = ""
    for (let i = 0; i < 6; i++) {
        let str = uuid.substring(i * 6, (i + 1) * 6)
        let x = parseInt(str, 16)
        sixChar += chars36[x % 36]
    }
    return moment().format("YYMM") + "-" + sixChar
}
module.exports.GenerateIndentID = GenerateIndentID

module.exports.GetTrackingId = function (requestId) {
    return requestId.substr(5) + "-" + Number(Date.now() + '' + Math.floor(Math.random() * 100)).toString(32).toUpperCase()
}

module.exports.FormatToUtcOffset8 = function (date) {
    return (date != "" && date != null) ? moment(date).utc().utcOffset(8).format("YYYY-MM-DDTHH:mm:ss.SSS+08:00") : ""
}

module.exports.SendDataToFirebase = async function (taskList, content, title = "INFO") {
    taskList = taskList.filter(a => a.driverId != null)
    if (taskList.length == 0) {
        return
    }
    let data = {
        "targetList": [],
        "title": title,
        "content": content
    }

    data.targetList = taskList.map(a => {
        return {
            "type": a.purpose,
            "taskId": a.taskId,
            "driverId": a.driverId,
            "vehicleNo": a.vehicleNumber,
        }
    })

    let url = conf.firebase_notification_url
    log.info("Firebase Request url: " + url)
    log.info("Firebase Request data: " + JSON.stringify(data, null, 2))

    let config = {
        method: 'post',
        url: url,
        headers: {
            'Content-Type': 'application/json'
        },
        data: data
    }

    return await axios(config).then((result) => {
        log.info("Firebase send finish.")
        return result
    }).catch((err) => {
        log.error(err);
        return null
    });
}

module.exports.CancelJob = async function (jobId) {
    let url = `https://${conf.cancel_job_url}/jobs/${jobId}/cancel?client_id=${conf.client_id}&client_secret=${conf.client_secret}`
    log.info("3rd Request Driver url: " + url)
    if (!conf.request_3rd_part) { return { message: ["success"] } }

    let config = {
        method: 'put',
        url: url,
        headers: {
            'Content-Type': 'application/json'
        },
    }

    return await axios(config).then((result) => {
        // log.info("3rd Response data: " + result.data)
        return result.data
    }).catch((err) => {
        log.error(err);
        return null
    });
}

const JobReturn = require('../json/job-return-json')
module.exports.SendDataTo3rd = async function (allocateeId, data) {
    let url = `https://${conf.create_job_url}?client_id=${conf.client_id}&client_secret=${conf.client_secret}&allocatee_id=${allocateeId}`
    log.info("3rd Request url: " + url)
    log.info("3rd Request data: " + JSON.stringify(data, null, 2))
    if (!conf.request_3rd_part) {
        return JobReturn.JobReturnJson()
    }

    let config = {
        method: 'post',
        url: url,
        headers: {
            'Content-Type': 'application/json'
        },
        data: data
    }

    return await axios(config).then((result) => {
        log.info("3rd Response data: " + JSON.stringify(result.data, null, 2))
        return result.data
    }).catch((err) => {
        log.error(err);
        return null
    });
}

module.exports.convertSendData = function (data) {
    let sendData = JSON.parse(data)
    let custom_fields_attributes = sendData.job.tasks_attributes[0].custom_fields_attributes
    for (let item of custom_fields_attributes) {
        if (item.custom_field_description_id == 2493) {
            item.custom_field_description_id = conf.CreateJobJsonField.UserNameField
        } else if (item.custom_field_description_id == 2550) {
            item.custom_field_description_id = conf.CreateJobJsonField.ContactNumberField
        } else if (item.custom_field_description_id == 2494) {
            item.custom_field_description_id = conf.CreateJobJsonField.ResourceField
        } else if (item.custom_field_description_id == 2495) {
            item.custom_field_description_id = conf.CreateJobJsonField.ServiceModeField
        } else if (item.custom_field_description_id == 2496) {
            item.custom_field_description_id = conf.CreateJobJsonField.TrackingIdField
        } else if (item.custom_field_description_id == 2523) {
            item.custom_field_description_id = conf.CreateJobJsonField.ActivityNameField
        } else if (item.custom_field_description_id == 2524) {
            item.custom_field_description_id = conf.CreateJobJsonField.StartTimeField
        } else if (item.custom_field_description_id == 2525) {
            item.custom_field_description_id = conf.CreateJobJsonField.EndTimeField
        } else if (item.custom_field_description_id == 2573) {
            item.custom_field_description_id = conf.CreateJobJsonField.PoNumberField
        }
    }
    sendData.job.tasks_attributes[0].custom_field_group_id = conf.CreateJobJsonField.GroupIdField
    return sendData
}

module.exports.SendTripToMobiusServer = async function (tripIdList) {
    if (tripIdList && tripIdList.length == 0 || !conf.auto_assign) {
        return
    }
    let url = `${conf.mobius_server_url}/assign/initSystemTaskByTripId`
    log.info(`(SendTripToMobiusServer) ${url}`);
    for (let tripId of tripIdList) {
        let config = {
            method: 'post',
            url: url,
            headers: {
                'Content-Type': 'application/json'
            },
            data: { tripId }
        }

        axios(config).then((result) => {
            log.info(result)
            return result
        }).catch((err) => {
            log.error(err);
            return null
        });
    }
}

module.exports.getSafeFileName = function (p) {
    p = p.replace(/%2e/ig, '.')
    p = p.replace(/%2f/ig, '/')
    p = p.replace(/%5c/ig, '\\')
    p = p.replace(/^[/\\]?/, '/')
    p = p.replace(/[/\\]\.\.[/\\]/, '/')
    p = path.normalize(p).replace(/\\/g, '/').slice(1)
    return p
}