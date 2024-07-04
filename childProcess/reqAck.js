
const log = require('../log/winston').logger('REQ ACK ChildProcess');
const path = require('path');
const moment = require('moment');
const { Sequelize, Op, QueryTypes } = require('sequelize');
const { sequelizeSystemObj } = require('../db/dbConf_system');
const csvUtil = require('../util/csvUtil');
const utils = require('../util/utils');
const conf = require('../conf/conf');

const { Prefix, NGTSFilenamePrefix } = require('../util/content');

const { NGTSReqAck } = require('../model/system/ngtsReqAck');
const { NGTSResp } = require('../model/system/ngtsResp');

const { Request2 } = require('../model/system/request2');
const { Job2, OperationHistory } = require('../model/system/job2');
const { Task2 } = require('../model/system/task');
const { TaskAccept } = require('../model/system/taskAccept');
const { ContractBalance } = require('../model/system/contractBalance');
const { InitialPurchaseOrder } = require('../model/system/purchaseOrder');


const reqAckService = require('../services/reqAckService');

const sftpUtil = require('../util/sftpUtil');

const customHeaders = ['referenceId', 'tripId', 'transacationType', 'transacationDateTime', 'requestorName',
    'trainingActivityName', 'conductingUnitCode', 'purposeNGTSId', 'serviceMode', 'resourceId', 'resourceQuantity', 'startDateTime',
    'endDateTime', 'pocUnitCode', 'pocName', 'pocMobileNumber', 'reportingLocationId', 'destinationLocationId',
    'preparkQuantity', 'preparkDateTime', 'numberOfDriver', 'wpmAllocatedNumber', 'remarks', 'reasonForChange'
]

const readCSVFileData = async function (file) {
    let { code, data } = await csvUtil.read(file, customHeaders)
    log.info(JSON.stringify(data, null, 2))
    let filename = path.basename(file).toUpperCase()
    return { filename, datas: data }
}
module.exports.readCSVFileData = readCSVFileData


const generateReqAck = async function (dateformat) {
    log.info(`\r\n`)
    let generateFiles = await reqAckService.SaveReqAckFile(dateformat)
    for (let file of generateFiles) {
        let { code, filename } = file
        if (code == 1) {
            log.info(`\r\n`)
            log.info(`-------------------Start Upload ${filename}-------------------`)
            await sftpUtil.uploadFileToFTPServer(filename)
            log.info(`-------------------End Upload ${filename}-------------------`)
            log.info(`\r\n`)
            await reqAckService.updateReqAckSendData()
        }

    }
    return { code: 1 }
}
module.exports.generateReqAck = generateReqAck

process.on('message', async processParams => {
    try {

        let dateformat = csvUtil.getFileNameDateFormat(processParams.cron)
        await generateReqAck(dateformat)


        let result = await sftpUtil.listFileFormFTPServer()
        log.info(result.data)
        let fileList = result.data.filter(file => {
            let filename = path.basename(file).toUpperCase()
            return filename.indexOf(NGTSFilenamePrefix.NGTS_REQ) != -1
        })

        if (fileList.length == 0) {
            log.info(`Cannot find ${NGTSFilenamePrefix.NGTS_REQ} file.`)
            process.send({ success: true })
            return
        }

        let fileDatas = []
        for (let file of fileList) {
            let filedata = await readCSVFileData(file)
            fileDatas.push(filedata)
        }
        await processReqAckFileDatas(fileDatas)

        await sftpUtil.putHistoryFilesToSFTPServer(result.data)
        // let tripDatas = await reqAckService.ValidTripData(fileDatas)

        // let reqAckList = reqAckService.GetReqAckModel(tripDatas)

        // let { createIndentList, updateTripList, cancelTripList, createErrorReqAckList, autoAssignedList } = await reqAckService.GetTripModel(tripDatas)
        // reqAckList = reqAckList.concat(...createErrorReqAckList)

        // let externalJobIdList = [] // externalJobId
        // let createTSPList = [] // { trackingId, allocateeId, tspName, requestor }
        // await sequelizeSystemObj.transaction(async (t1) => {
        //     if (reqAckList.length) {
        //         await NGTSReqAck.bulkCreate(reqAckList)
        //     }

        //     // create
        //     for (let row of createIndentList) {
        //         log.info(JSON.stringify(row, null, 2))
        //         let { indentOperationRecord, tripList } = row
        //         await Request2.create(row)
        //         await OperationHistory.create(indentOperationRecord)

        //         for (let trip of tripList) {
        //             let { tripOperationRecord, taskList } = trip
        //             let job = await Job2.create(trip, { returning: true })
        //             tripOperationRecord.tripId = job.id
        //             await OperationHistory.create(tripOperationRecord)

        //             for (let task of taskList) {
        //                 task.tripId = job.id
        //                 let taskOperationRecord = task.taskOperationRecord
        //                 let taskObj = await Task2.create(task, { returning: true })
        //                 taskOperationRecord.tripId = job.id
        //                 taskOperationRecord.taskId = taskObj.id
        //                 await OperationHistory.create(taskOperationRecord)
        //             }
        //         }
        //     }

        //     // update
        //     for (let row of updateTripList) {
        //         let { newJobList, needCreateTSPList, needCancelTSPList, needDeleteTaskIdList, needDeleteTripIdList, updateCancelTaskAcceptIdList } = row
        //         createTSPList.push(...needCreateTSPList)
        //         externalJobIdList.push(...needCancelTSPList)

        //         await Task2.destroy({
        //             where: {
        //                 id: {
        //                     [Op.in]: needDeleteTaskIdList
        //                 }
        //             }
        //         })
        //         await Job2.destroy({
        //             where: {
        //                 id: {
        //                     [Op.in]: needDeleteTripIdList
        //                 }
        //             }
        //         })
        //         // Restore pending
        //         await resetPendingBalance(needDeleteTaskIdList)

        //         await InitialPurchaseOrder.destroy({
        //             where: {
        //                 taskId: {
        //                     [Op.in]: needDeleteTaskIdList
        //                 }
        //             }
        //         })
        //         if (updateCancelTaskAcceptIdList.length) {
        //             await TaskAccept.update({
        //                 status: 'Cancelled'
        //             }, {
        //                 where: {
        //                     id: {
        //                         [Op.in]: updateCancelTaskAcceptIdList
        //                     }
        //                 }
        //             })
        //         }

        //         for (let trip of newJobList) {
        //             let { oldJobHistory, tripOperationRecord, oldOperationHistoryList, taskList } = trip

        //             let historyId = null
        //             if (oldJobHistory) {
        //                 historyId = await reqAckService.CopyRecordToHistory(oldJobHistory)
        //                 if (oldJobHistory.preparkJob) {
        //                     await reqAckService.CopyRecordToHistory(oldJobHistory.preparkJob)
        //                 }
        //             }
        //             let job = await Job2.create(trip, { returning: true })
        //             tripOperationRecord.tripId = job.id
        //             tripOperationRecord.jobHistoryId = historyId
        //             await OperationHistory.create(tripOperationRecord)

        //             if (oldOperationHistoryList && oldOperationHistoryList.length) {
        //                 oldOperationHistoryList.forEach(item => { item.tripId = job.id })
        //                 await OperationHistory.bulkCreate(oldOperationHistoryList)
        //             }

        //             for (let task of taskList) {
        //                 task.tripId = job.id
        //                 let taskOperationRecord = task.taskOperationRecord
        //                 let taskObj = await Task2.create(task, { returning: true })
        //                 taskOperationRecord.tripId = job.id
        //                 taskOperationRecord.taskId = taskObj.id
        //                 await OperationHistory.create(taskOperationRecord)
        //             }
        //         }
        //     }

        //     // cancel
        //     for (let row of cancelTripList) {
        //         let { needCancelTrips, sendCancelJobList, updateCancelTaskAcceptIdList } = row
        //         for (let trip of needCancelTrips) {
        //             let { tripId, jobOperationRecord, tasks } = trip
        //             await Job2.update({
        //                 status: "Cancelled"
        //             }, {
        //                 where: {
        //                     id: tripId
        //                 }
        //             })
        //             await OperationHistory.create(jobOperationRecord)

        //             for (let task of tasks) {
        //                 let { id, taskOperationRecord } = task
        //                 await Task2.update({
        //                     taskStatus: "cancelled",
        //                     driverId: null,
        //                     cancellationTime: trip.cancelldTime
        //                 }, {
        //                     where: {
        //                         id: id
        //                     }
        //                 })

        //                 if (taskOperationRecord) {
        //                     await OperationHistory.create(taskOperationRecord)
        //                 }
        //             }
        //         }
        //         if (updateCancelTaskAcceptIdList.length) {
        //             await TaskAccept.update({
        //                 status: 'Cancelled'
        //             }, {
        //                 where: {
        //                     id: {
        //                         [Op.in]: updateCancelTaskAcceptIdList
        //                     }
        //                 }
        //             })
        //         }
        //         externalJobIdList.push(...sendCancelJobList)
        //     }
        // })

        // if (externalJobIdList.length) {
        //     for (let externalJobId of externalJobIdList) {
        //         await utils.CancelJob(externalJobId)
        //         await utils.wait(500)
        //     }
        // }

        // if (createTSPList.length) {
        //     for (let row of createTSPList) {
        //         await sendTSP(row)
        //         await utils.wait(500)
        //     }
        // }

        // if (autoAssignedList.length > 0 && conf.auto_assign) {
        //     let tripList = await Job2.findAll({
        //         attributes: ['id'],
        //         where: {
        //             tripNo: {
        //                 [Op.in]: autoAssignedList
        //             }
        //         }
        //     })
        //     let tripIdList = tripList.map(o => o.id)
        //     await utils.SendTripToMobiusServer(tripIdList)
        // }
        process.send({ success: true })

    } catch (error) {
        log.error(error);
        process.send({ success: false, error })
    }
})


const processReqAckFileDatas = async function (fileDatas) {
    try {

        let tripDatas = await reqAckService.ValidTripData(fileDatas)

        let respInvalidDataList = getRespInvalidDatas(tripDatas)

        let reqAckList = reqAckService.GetReqAckModel(tripDatas)

        let { createIndentList, updateTripList, cancelTripList, createErrorReqAckList, autoAssignedList } = await reqAckService.GetTripModel(tripDatas)
        reqAckList = reqAckList.concat(...createErrorReqAckList)

        let externalJobIdList = [] // externalJobId
        let createTSPList = [] // { trackingId, allocateeId, tspName, requestor }
        await sequelizeSystemObj.transaction(async (t1) => {
            if (reqAckList.length > 0) {
                await NGTSReqAck.bulkCreate(reqAckList)
            }
            if (respInvalidDataList.length > 0) {
                await NGTSResp.bulkCreate(respInvalidDataList)
            }

            // create
            await createATMSIndentByFile(createIndentList)

            // update
            await updateATMSIndentByFile(updateTripList, createTSPList, externalJobIdList)

            // cancel
            await cancelATMSIndentByFile(cancelTripList, externalJobIdList)
        })

        if (externalJobIdList.length) {
            for (let externalJobId of externalJobIdList) {
                await utils.CancelJob(externalJobId)
                await utils.wait(500)
            }
        }

        if (createTSPList.length) {
            for (let row of createTSPList) {
                await sendTSP(row)
                await utils.wait(500)
            }
        }

        if (autoAssignedList.length > 0 && conf.auto_assign) {
            let tripList = await Job2.findAll({
                attributes: ['id'],
                where: {
                    tripNo: {
                        [Op.in]: autoAssignedList
                    }
                }
            })
            let tripIdList = tripList.map(o => o.id)
            await utils.SendTripToMobiusServer(tripIdList)
        }
        return reqAckList.filter(o => o.referenceId != 'HH')
    } catch (error) {
        log.error(error);
        return []
    }
}
module.exports.processReqAckFileDatas = processReqAckFileDatas

const getRespInvalidDatas = function (tripDatas) {
    let respInvalidDataList = []
    for (let item of tripDatas) {
        if (item.respInvalidDataList.length > 0) {
            respInvalidDataList.push(...item.respInvalidDataList)
        }
    }
    return respInvalidDataList
}

const createATMSIndentByFile = async function (createIndentList) {
    for (let row of createIndentList) {
        log.info(JSON.stringify(row, null, 2))
        let { indentOperationRecord, tripList } = row
        await Request2.create(row)
        await OperationHistory.create(indentOperationRecord)

        for (let trip of tripList) {
            let { tripOperationRecord, taskList } = trip
            let job = await Job2.create(trip, { returning: true })
            tripOperationRecord.tripId = job.id
            await OperationHistory.create(tripOperationRecord)

            let ngtsRespRecord = trip.ngtsRespRecord
            ngtsRespRecord.atmsTaskId = job.id
            ngtsRespRecord.ngtsJobId = job.id
            await NGTSResp.create(ngtsRespRecord)

            for (let task of taskList) {
                task.tripId = job.id
                let taskOperationRecord = task.taskOperationRecord
                let taskObj = await Task2.create(task, { returning: true })
                taskOperationRecord.tripId = job.id
                taskOperationRecord.taskId = taskObj.id
                await OperationHistory.create(taskOperationRecord)

            }
        }
    }
}

const updateATMSIndentByFile = async function (updateTripList, createTSPList, externalJobIdList) {
    for (let row of updateTripList) {
        let { newJobList, needCreateTSPList, needCancelTSPList, needDeleteTaskIdList, needDeleteTripIdList, updateCancelTaskAcceptIdList } = row
        createTSPList.push(...needCreateTSPList)
        externalJobIdList.push(...needCancelTSPList)

        await Task2.destroy({
            where: {
                id: {
                    [Op.in]: needDeleteTaskIdList
                }
            }
        })
        await Job2.destroy({
            where: {
                id: {
                    [Op.in]: needDeleteTripIdList
                }
            }
        })
        // Restore pending
        await resetPendingBalance(needDeleteTaskIdList)

        await InitialPurchaseOrder.destroy({
            where: {
                taskId: {
                    [Op.in]: needDeleteTaskIdList
                }
            }
        })
        if (updateCancelTaskAcceptIdList.length) {
            await TaskAccept.update({
                status: 'Cancelled'
            }, {
                where: {
                    id: {
                        [Op.in]: updateCancelTaskAcceptIdList
                    }
                }
            })
        }

        for (let trip of newJobList) {
            let { oldJobHistory, tripOperationRecord, oldOperationHistoryList, taskList } = trip

            let historyId = null
            if (oldJobHistory) {
                historyId = await reqAckService.CopyRecordToHistory(oldJobHistory)
                if (oldJobHistory.preparkJob) {
                    await reqAckService.CopyRecordToHistory(oldJobHistory.preparkJob)
                }
            }
            let job = await Job2.create(trip, { returning: true })
            tripOperationRecord.tripId = job.id
            tripOperationRecord.jobHistoryId = historyId
            await OperationHistory.create(tripOperationRecord)

            if (oldOperationHistoryList && oldOperationHistoryList.length) {
                oldOperationHistoryList.forEach(item => { item.tripId = job.id })
                await OperationHistory.bulkCreate(oldOperationHistoryList)
            }

            let ngtsRespRecord = trip.ngtsRespRecord
            ngtsRespRecord.atmsTaskId = job.id
            ngtsRespRecord.ngtsJobId = job.id
            await NGTSResp.create(ngtsRespRecord)

            for (let task of taskList) {
                task.tripId = job.id
                let taskOperationRecord = task.taskOperationRecord
                let taskObj = await Task2.create(task, { returning: true })
                taskOperationRecord.tripId = job.id
                taskOperationRecord.taskId = taskObj.id
                await OperationHistory.create(taskOperationRecord)

            }
        }
    }
}

const cancelATMSIndentByFile = async function (cancelTripList, externalJobIdList) {
    for (let row of cancelTripList) {
        let { needCancelTrips, sendCancelJobList, updateCancelTaskAcceptIdList } = row
        for (let trip of needCancelTrips) {
            let { tripId, jobOperationRecord, tasks, ngtsRespRecord } = trip
            await Job2.update({
                status: "Cancelled"
            }, {
                where: {
                    id: tripId
                }
            })
            await OperationHistory.create(jobOperationRecord)
            await NGTSResp.create(ngtsRespRecord)

            for (let task of tasks) {
                let { id, taskOperationRecord } = task
                await Task2.update({
                    taskStatus: "cancelled",
                    driverId: null,
                    cancellationTime: trip.cancelldTime
                }, {
                    where: {
                        id: id
                    }
                })

                if (taskOperationRecord) {
                    await OperationHistory.create(taskOperationRecord)
                }

            }
        }
        if (updateCancelTaskAcceptIdList.length) {
            await TaskAccept.update({
                status: 'Cancelled'
            }, {
                where: {
                    id: {
                        [Op.in]: updateCancelTaskAcceptIdList
                    }
                }
            })
        }
        externalJobIdList.push(...sendCancelJobList)
    }
}

const sendTSP = async function (row) {
    let { trackingId, allocateeId, tspName, requestor } = row

    let task = await Task2.findOne({
        where: {
            trackingId: trackingId
        }
    })
    let sendData = utils.convertSendData(task.sendData)

    let JobReturnJson = await utils.SendDataTo3rd(allocateeId, sendData)
    let ReturnJson = JSON.parse(JSON.stringify(JobReturnJson))
    if (ReturnJson != null) {
        let externalJobId = ReturnJson.job.id
        let guid = ReturnJson.job.guid
        let externalTask = ReturnJson.job.tasks[0]
        let externalTaskId = externalTask.id

        let updateObj = {
            externalJobId: externalJobId,
            externalTaskId: externalTaskId,
            returnData: JSON.stringify(ReturnJson),
            guid: guid,
            success: true,
            jobStatus: ReturnJson.job.state,
        }
        await Task2.update(updateObj, { where: { id: task.id } })
    }
    let data = {
        requestId: task.requestId,
        tripId: task.tripId,
        taskId: task.id,
        status: `Create TSP`,
        action: `Create TSP`,
        remark: tspName,
        jsonData: JSON.stringify(sendData),
        requestorName: requestor.requestorName,
        unitCode: requestor.unitCode,
        createdAt: new Date(),
    }
    await OperationHistory.create(data)
}

const resetPendingBalance = async function (taskIdArr) {
    let rows = await sequelizeSystemObj.query(
        `select 
            a.id, a.executionDate, SUBSTRING_INDEX(b.contractPartNo, '-', 1) AS contractNo, b.total 
        from (
            select id, executionDate from job_task where id in (?)
        ) a LEFT JOIN 
        (
            select taskId, total, contractPartNo from initial_purchase_order where taskId in (?)
        ) b on a.id = b.taskId where b.contractPartNo is not null`,
        {
            replacements: [taskIdArr, taskIdArr],
            type: QueryTypes.SELECT,
        }
    );
    if (rows.length == 0) {
        return
    }
    let contractNoList = [...new Set(rows.map(o => o.contractNo))]

    let contractBalanceList = await ContractBalance.findAll({
        where: {
            contractNo: {
                [Op.in]: contractNoList
            }
        }
    })
    if (contractBalanceList.length == 0) {
        return
    }


    let updateObj = []
    for (let item of contractBalanceList) {
        let { id, contractNo, startDate, endDate, pending, total, spending } = item
        let initialPOList = rows.filter(o => o.contractNo == contractNo && moment(o.executionDate).isBetween(moment(startDate), moment(endDate), null, '[]'))
        if (initialPOList.length > 0) {
            let pendingSum = _.sumBy(initialPOList, (o) => { return Number(o.total) })
            updateObj.push({
                id: id,
                pending: Number(pending) - pendingSum,
                balance: Number(total) - Number(spending) - (Number(pending) - pendingSum)
            })
        }
    }
    if (updateObj.length > 0) {
        for (let row of updateObj) {
            await ContractBalance.update({
                pending: row.pending,
                balance: row.balance,
            }, {
                where: {
                    id: row.id
                }
            })
        }
    }
}