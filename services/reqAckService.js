const moment = require('moment');
const conf = require('../conf/conf.js');
const text = `REQ ACK Service`
const log = require('../log/winston').logger(text);
const { Sequelize, Op, QueryTypes } = require('sequelize');
const { Prefix, NGTSFilenamePrefix } = require('../util/content');
const csvUtil = require('../util/csvUtil');
const utils = require('../util/utils');


const { RegexContent, ChargeType } = require('../util/content')
const { ErrorEnum } = require('../util/errorCode')
const { Location } = require('../model/system/location');
const { NGTSReqAck } = require('../model/system/ngtsReqAck');
const { NGTSResp } = require('../model/system/ngtsResp');
const { Group } = require('../model/system/group');
const { NGTSVehicle } = require('../model/system/ngtsVehicle');
const { RecurringMode } = require('../model/system/recurringMode');
const { ServiceMode } = require('../model/system/serviceMode');
const { ServiceType } = require('../model/system/serviceType');
const { PurposeMode } = require('../model/system/purposeMode');
const { PurposeServiceType } = require('../model/system/purposeServiceType');
const { Task2, JobTaskHistory2 } = require('../model/system/task');
const { TaskAccept } = require('../model/system/taskAccept');
const { ServiceProvider } = require('../model/system/serviceProvider');

const { CreateJobJson } = require('../json/job-create-json')

let { GenerateIndentID, GetTrackingId, FormatToUtcOffset8 } = require('../util/utils')

const { sequelizeSystemObj } = require('../db/dbConf_system');
const { sequelizeServerObj } = require('../db/dbConf_server');
const { Job2, OperationHistory, Job2History } = require('../model/system/job2.js');

const fmt = "YYYY-MM-DD HH:mm"
const fmt1 = "YYYYMMDDHHmmss"
const convertDate = function (dateStr) {
    if (!dateStr) {
        return null
    }
    var pattern = /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/;
    var formatDateStr = dateStr.replace(pattern, '$1/$2/$3 $4:$5:$6');
    return new Date(formatDateStr);
}

const convertDateTimeStr = function (date) {
    if (!date) {
        return ""
    }
    return moment(date).format("YYYYMMDDHHmmss")
}

const ValidTripData = async function (fileDatas) {
    let result = []
    for (let list of fileDatas) {
        let { filename, datas } = list
        let validDataList = []
        let errorDataList = []
        let lastRow = datas.find(o => o.referenceId == "FF")
        if (lastRow && Number(lastRow.tripId) != datas.length - 1 || !lastRow) {
            errorDataList.push({ referenceId: null, lineNumber: datas.length, errorCode: ErrorEnum.Incorrect_NoOfRecords_Error.code, errorMessage: ErrorEnum.Incorrect_NoOfRecords_Error.message })
            result.push({ filename, validDataList, errorDataList })
        }
    }
    if (result.length) {
        return result
    }

    let locationList = await Location.findAll({
        where: {
            belongTo: 'ATMS'
        }
    })
    let vehicleList = await NGTSVehicle.findAll()
    let purposeModeList = await PurposeMode.findAll()


    for (let list of fileDatas) {
        let { filename, datas } = list
        let lineNumber = 1
        let validDataList = []
        let errorDataList = []
        for (let data of datas) {
            let error = []
            let { tripId, referenceId, transacationType, transacationDateTime, requestorName,
                trainingActivityName, conductingUnitCode, purposeNGTSId, serviceMode, resourceId, resourceQuantity, startDateTime,
                endDateTime, pocUnitCode, pocName, pocMobileNumber, reportingLocationId, destinationLocationId,
                preparkQuantity, preparkDateTime, numberOfDriver, wpmAllocatedNumber, remarks, reasonForChange } = data

            if (referenceId == "FF") {
                break
            }
            if (!referenceId || !conductingUnitCode || !purposeNGTSId || !serviceMode || !resourceId || !startDateTime || !endDateTime || !pocName || !pocMobileNumber
                || !reportingLocationId || !destinationLocationId) {
                error.push({ referenceId, lineNumber, errorCode: ErrorEnum.Empty_Err.code, errorMessage: ErrorEnum.Empty_Err.message })
            }

            if (!RegexContent.NGTS_Trip_ID.test(tripId)) {
                error.push({ referenceId, lineNumber, errorCode: ErrorEnum.NGTS_Trip_ID_RegexErr.code, errorMessage: ErrorEnum.NGTS_Trip_ID_RegexErr.message })
            }
            if (!RegexContent.ATMs_Reference_ID.test(referenceId)) {
                error.push({ referenceId, lineNumber, errorCode: ErrorEnum.ATMs_Reference_ID_RegexErr.code, errorMessage: ErrorEnum.ATMs_Reference_ID_RegexErr.message })
            }
            if (!RegexContent.Transaction_Type.test(transacationType)) {
                error.push({ referenceId, lineNumber, errorCode: ErrorEnum.Transaction_Type_RegexErr.code, errorMessage: ErrorEnum.Transaction_Type_RegexErr.message })
            }

            if (!RegexContent.Transaction_Datetime.test(transacationDateTime) || !moment(transacationDateTime, fmt1).isValid()) {
                error.push({ referenceId, lineNumber, errorCode: ErrorEnum.Transaction_Datetime_RegexErr.code, errorMessage: ErrorEnum.Transaction_Datetime_RegexErr.message })
            }
            if (!RegexContent.Requestor_Name.test(requestorName)) {
                error.push({ referenceId, lineNumber, errorCode: ErrorEnum.Requestor_Name_RegexErr.code, errorMessage: ErrorEnum.Requestor_Name_RegexErr.message })
            }
            if (!RegexContent.Training_Activity_Name.test(trainingActivityName)) {
                error.push({ referenceId, lineNumber, errorCode: ErrorEnum.Training_Activity_Name_RegexErr.code, errorMessage: ErrorEnum.Training_Activity_Name_RegexErr.message })
            }
            if (!RegexContent.ConductingUnit_Code.test(conductingUnitCode)) {
                error.push({ referenceId, lineNumber, errorCode: ErrorEnum.ConductingUnit_Code_RegexErr.code, errorMessage: ErrorEnum.ConductingUnit_Code_RegexErr.message })
            }
            if (!RegexContent.Service_Mode.test(serviceMode)) {
                error.push({ referenceId, referenceId, lineNumber, errorCode: ErrorEnum.Service_Mode_RegexErr.code, errorMessage: ErrorEnum.Service_Mode_RegexErr.message })
            }
            if (!RegexContent.Purpose.test(purposeNGTSId)) {
                error.push({ referenceId, referenceId, lineNumber, errorCode: ErrorEnum.Purpose_RegexErr.code, errorMessage: ErrorEnum.Purpose_RegexErr.message })
            }
            if (!RegexContent.NGTS_Resource_ID.test(resourceId)) {
                error.push({ referenceId, referenceId, lineNumber, errorCode: ErrorEnum.NGTS_Resource_ID_RegexErr.code, errorMessage: ErrorEnum.NGTS_Resource_ID_RegexErr.message })
            }

            if (!RegexContent.Resource_Quantity.test(resourceQuantity)) {
                error.push({ referenceId, referenceId, lineNumber, errorCode: ErrorEnum.Resource_Quantity_RegexErr.code, errorMessage: ErrorEnum.Resource_Quantity_RegexErr.message })
            }
            if (!RegexContent.Start_DateTime.test(startDateTime) || !moment(startDateTime, fmt1).isValid()) {
                error.push({ referenceId, referenceId, lineNumber, errorCode: ErrorEnum.Start_DateTime_RegexErr.code, errorMessage: ErrorEnum.Start_DateTime_RegexErr.message })
            }
            if (!RegexContent.End_DateTime.test(endDateTime) || !moment(endDateTime, fmt1).isValid()) {
                error.push({ referenceId, referenceId, lineNumber, errorCode: ErrorEnum.End_DateTime_RegexErr.code, errorMessage: ErrorEnum.End_DateTime_RegexErr.message })
            }
            if (!RegexContent.POC_Unit_Code.test(pocUnitCode)) {
                error.push({ referenceId, referenceId, lineNumber, errorCode: ErrorEnum.POC_Unit_Code_RegexErr.code, errorMessage: ErrorEnum.POC_Unit_Code_RegexErr.message })
            }

            if (!RegexContent.POC_Name.test(pocName)) {
                error.push({ referenceId, referenceId, lineNumber, errorCode: ErrorEnum.POC_Name_RegexErr.code, errorMessage: ErrorEnum.POC_Name_RegexErr.message })
            }
            if (!RegexContent.POC_Mobile_Number.test(pocMobileNumber)) {
                error.push({ referenceId, referenceId, lineNumber, errorCode: ErrorEnum.POC_Mobile_Number_RegexErr.code, errorMessage: ErrorEnum.POC_Mobile_Number_RegexErr.message })
            }
            if (!RegexContent.Reporting_Location_ID.test(reportingLocationId)) {
                error.push({ referenceId, lineNumber, errorCode: ErrorEnum.Reporting_Location_ID_RegexErr.code, errorMessage: ErrorEnum.Reporting_Location_ID_RegexErr.message })
            }
            if (!RegexContent.Destination_Location_ID.test(destinationLocationId)) {
                error.push({ referenceId, lineNumber, errorCode: ErrorEnum.Destination_Location_ID_RegexErr.code, errorMessage: ErrorEnum.Destination_Location_ID_RegexErr.message })
            }

            if (!RegexContent.Prepark_Quantity.test(preparkQuantity)) {
                error.push({ referenceId, lineNumber, errorCode: ErrorEnum.Prepark_Quantity_RegexErr.code, errorMessage: ErrorEnum.Prepark_Quantity_RegexErr.message })
            }
            if (preparkDateTime && (!RegexContent.Prepark_DateTime.test(preparkDateTime) || !moment(preparkDateTime, fmt1).isValid())) {
                error.push({ referenceId, lineNumber, errorCode: ErrorEnum.Prepark_DateTime_RegexErr.code, errorMessage: ErrorEnum.Prepark_DateTime_RegexErr.message })
            }
            if (!RegexContent.Number_of_Driver.test(numberOfDriver)) {
                error.push({ referenceId, lineNumber, errorCode: ErrorEnum.Number_of_Driver_RegexErr.code, errorMessage: ErrorEnum.Number_of_Driver_RegexErr.message })
            }
            if (!RegexContent.WPM_allocated_number.test(wpmAllocatedNumber)) {
                error.push({ referenceId, lineNumber, errorCode: ErrorEnum.WPM_allocated_number_RegexErr.code, errorMessage: ErrorEnum.WPM_allocated_number_RegexErr.message })
            }
            if (!RegexContent.Remarks.test(remarks)) {
                error.push({ referenceId, lineNumber, errorCode: ErrorEnum.Remarks_RegexErr.code, errorMessage: ErrorEnum.Remarks_RegexErr.message })
            }
            if (!RegexContent.Reason_for_Change.test(reasonForChange)) {
                error.push({ referenceId, lineNumber, errorCode: ErrorEnum.Reason_for_Change_RegexErr.code, errorMessage: ErrorEnum.Reason_for_Change_RegexErr.message })
            }

            if (RegexContent.Start_DateTime.test(startDateTime) && RegexContent.End_DateTime.test(endDateTime)) {
                if (moment(convertDate(startDateTime)).isAfter(moment(convertDate(endDateTime)))) {
                    error.push({ referenceId, lineNumber, errorCode: ErrorEnum.End_DateTime_Error.code, errorMessage: ErrorEnum.End_DateTime_Error.message })
                }
            }
            if (RegexContent.Prepark_DateTime.test(preparkDateTime) && RegexContent.Start_DateTime.test(startDateTime)) {
                if (moment(convertDate(preparkDateTime)).isAfter(moment(convertDate(startDateTime)))) {
                    error.push({ referenceId, lineNumber, errorCode: ErrorEnum.Prepark_DateTime_Error.code, errorMessage: ErrorEnum.Prepark_DateTime_Error.message })
                }
            }
            let reportingLocation = locationList.find(o => o.id == Number(reportingLocationId))
            let destinationLocation = locationList.find(o => o.id == Number(destinationLocationId))
            if (!reportingLocation) {
                error.push({ referenceId, lineNumber, errorCode: ErrorEnum.Reporting_Location_ID_NOTEXIST.code, errorMessage: ErrorEnum.Reporting_Location_ID_NOTEXIST.message })
            }
            if (!destinationLocation) {
                error.push({ referenceId, lineNumber, errorCode: ErrorEnum.Destination_Location_ID_NOTEXIST.code, errorMessage: ErrorEnum.Destination_Location_ID_NOTEXIST.message })
            }
            if (Number(preparkQuantity) != 0 && Number(preparkQuantity) > Number(resourceQuantity)) {
                error.push({ referenceId, lineNumber, errorCode: ErrorEnum.Prepark_Quantity_Error.code, errorMessage: ErrorEnum.Prepark_Quantity_Error.message })
            }
            if (Number(numberOfDriver) != 0 && Number(numberOfDriver) > Number(resourceQuantity)) {
                error.push({ referenceId, lineNumber, errorCode: ErrorEnum.Number_of_Driver_Error.code, errorMessage: ErrorEnum.Number_of_Driver_Error.message })
            }

            let vehicle = vehicleList.find(o => o.id == Number(resourceId))
            if (!vehicle) {
                error.push({ referenceId, lineNumber, errorCode: ErrorEnum.NGTS_Resource_ID_NOTEXIST.code, errorMessage: ErrorEnum.NGTS_Resource_ID_NOTEXIST.message })
            }

            let purposeMode = purposeModeList.find(o => o.ngtsId == purposeNGTSId)
            if (!purposeMode) {
                error.push({ referenceId, lineNumber, errorCode: ErrorEnum.Purpose_NOTEXIST.code, errorMessage: ErrorEnum.Purpose_NOTEXIST.message })
            }

            if (error.length == 0) {
                data.transacationDateTime = convertDate(data.transacationDateTime)
                data.startDateTime = convertDate(data.startDateTime)
                data.endDateTime = convertDate(data.endDateTime)
                data.preparkDateTime = convertDate(data.preparkDateTime)

                data.pickupDestination = reportingLocation
                data.dropoffDestination = destinationLocation
                data.lineNumber = lineNumber
                data.filename = filename
                data.vehicle = vehicle
                data.purposeMode = purposeMode

                validDataList.push(data)
            } else {
                errorDataList.push(...error)
            }
            lineNumber += 1
        }

        result.push({ filename, validDataList, errorDataList })
    }
    return result
}

module.exports.ValidTripData = ValidTripData

module.exports.GetReqAckModel = function (datas) {
    let result = []
    for (let data of datas) {
        let { filename, errorDataList } = data
        errorDataList.forEach((row) => {
            row.fromFile = filename
            result.push(row)
        })
    }
    return result
}

module.exports.GetTripModel = async function (tripDatas) {

    let datas = tripDatas.filter(o => o.validDataList.length > 0)
    if (datas.length == 0) {
        return { createIndentList: [], updateTripList: [], cancelTripList: [], createErrorReqAckList: [], autoAssignedList: [] }
    }

    let unitCodeList = await Group.findAll()
    let recurringModeList = await RecurringMode.findAll()

    let serviceModeList = await ServiceMode.findAll()
    let mobiusSubUnits = await sequelizeServerObj.query(
        `SELECT
            id, \`group\`
        FROM unit
        WHERE subUnit IS NOT NULL;`,
        {
            type: QueryTypes.SELECT,
        }
    );

    let purposeServiceTypeList = await PurposeServiceType.findAll()

    let createIndentList = []
    let updateTripList = []
    let cancelTripList = []
    let createErrorReqAckList = []
    let autoAssignedList = []
    for (let data of datas) {
        let { filename, validDataList } = data
        let createDataList = validDataList.filter(row => row.transacationType == 'N')
        let updateDataList = validDataList.filter(row => row.transacationType == 'U')
        let cancelDataList = validDataList.filter(row => row.transacationType == 'C')


        // create
        let { indentList, autoAssignedTripNoList } = await GetCreateModel(createDataList, unitCodeList, recurringModeList, serviceModeList, mobiusSubUnits, purposeServiceTypeList)
        if (indentList.length > 0) {
            createIndentList.push(...indentList)
        }
        if (autoAssignedTripNoList.length > 0) {
            autoAssignedList.push(...autoAssignedTripNoList)
        }

        // update
        // { newJobList, needCreateTSPList, needCancelTSPList, needDeleteTaskIdList, needDeleteTripIdList, updateCancelTaskAcceptIdList, errorUpdateReqAckList }
        let updateModelList = await GetUpdateModel(updateDataList, recurringModeList, serviceModeList, mobiusSubUnits, purposeServiceTypeList)
        if (updateModelList.newJobList.length > 0) {
            updateTripList.push({
                newJobList: updateModelList.newJobList,
                needCreateTSPList: updateModelList.needCreateTSPList,
                needCancelTSPList: updateModelList.needCancelTSPList,
                needDeleteTaskIdList: updateModelList.needDeleteTaskIdList,
                needDeleteTripIdList: updateModelList.needDeleteTripIdList,
                updateCancelTaskAcceptIdList: updateModelList.updateCancelTaskAcceptIdList
            })
        }
        if (updateModelList.errorUpdateReqAckList.length > 0) {
            updateModelList.errorUpdateReqAckList.forEach((row) => {
                row.fromFile = filename
            })
            createErrorReqAckList.push(...updateModelList.errorUpdateReqAckList)
        }

        if (updateModelList.autoAssignedTripNoList.length > 0) {
            autoAssignedList.push(...updateModelList.autoAssignedTripNoList)
        }

        //cancel
        let { needCancelTrips, sendCancelJobList, updateCancelTaskAcceptIdList, errorCancelReqAckList } = await GetCancelModel(cancelDataList)
        // log.info("errorCancelReqAckList:")
        // log.info(JSON.stringify(errorCancelReqAckList, null, 2))

        // log.info("needCancelTrips:")
        // log.info(JSON.stringify(needCancelTrips, null, 2))

        // log.info("sendCancelJobList:")
        // log.info(JSON.stringify(sendCancelJobList, null, 2))

        // log.info("updateCancelTaskAcceptIdList:")
        // log.info(JSON.stringify(updateCancelTaskAcceptIdList, null, 2))

        if (needCancelTrips.length > 0) {
            cancelTripList.push({ needCancelTrips, sendCancelJobList, updateCancelTaskAcceptIdList })
        }
        if (errorCancelReqAckList.length > 0) {
            errorCancelReqAckList.forEach((row) => {
                row.fromFile = filename
            })
            createErrorReqAckList.push(...errorCancelReqAckList)
        }
    }
    log.info(JSON.stringify(updateTripList, null, 2))
    return { createIndentList, updateTripList, cancelTripList, createErrorReqAckList, autoAssignedList }
}

const GetRequestModel = function (row, unitCodeList) {
    let requestId = GenerateIndentID()
    let unit = unitCodeList.find(o => o.groupName == row.conductingUnitCode)
    let indent = {
        id: requestId,
        purposeType: row.purposeMode.name,
        additionalRemarks: row.trainingActivityName,
        groupId: unit ? unit.id : null,
        requestorName: row.requestorName,
        startDate: moment(row.startDateTime).format("YYYY-MM-DD"),
    }

    indent.indentOperationRecord = {
        requestId: requestId,
        action: "New Indent",
        remark: row.remarks,
        requestorName: row.requestorName,
        unitCode: row.conductingUnitCode,
    }

    return indent
}

const GetJobModel = function (requestId, tripNo, row, vehicle, recurringMode, purposeServiceTypeList) {
    let executionDate = moment(row.startDateTime).format('YYYY-MM-DD')
    let executionTime = moment(row.startDateTime).format('HH:mm')
    let duration = null
    if (vehicle.group == 'C' && vehicle.serviceMode != '1-Way' && vehicle.serviceMode != 'Ferry Service') {
        duration = moment(row.endDateTime).diff(moment(row.startDateTime), 'h')
    }
    let trip = {
        requestId: requestId,
        tripNo: tripNo,
        referenceId: row.referenceId,
        status: 'Approved',
        resourceId: row.resourceId,
        vehicleType: vehicle.resourceType,
        noOfVehicle: Number(row.resourceQuantity),
        noOfDriver: Number(row.numberOfDriver),
        pocUnitCode: row.pocUnitCode,
        poc: row.pocName,
        pocNumber: row.pocMobileNumber,
        repeats: recurringMode.value,
        executionDate: executionDate,
        executionTime: executionTime,
        duration: duration,
        endorse: 0,
        approve: 1,
        isImport: 0,
        completeCount: 0,
        driver: Number(row.numberOfDriver) == 0 ? 0 : 1,
        preParkDate: row.preparkDateTime ? moment(row.preparkDateTime).format(fmt) : null,
        periodStartDate: moment(row.startDateTime).format(fmt),
        periodEndDate: moment(row.endDateTime).format(fmt),
        tripRemarks: row.remarks,
        serviceModeId: vehicle.serviceModeId,
        serviceTypeId: vehicle.serviceTypeId,
        reEdit: 0,
        startsOn: executionDate,
        pickupDestination: row.pickupDestination.locationName,
        dropoffDestination: row.dropoffDestination.locationName,
        pickupDestinationId: Number(row.reportingLocationId),
        dropoffDestinationId: Number(row.destinationLocationId),
        startDate: row.startDateTime,
        endDate: row.endDateTime,
    }
    let purposeServiceType = purposeServiceTypeList.filter(o => {
        if (o && o.serviceTypeId) {
            let serviceTypeIdList = o.serviceTypeId.split(',')
            serviceTypeIdList = serviceTypeIdList.map(Number)
            return serviceTypeIdList.includes(Number(trip.serviceTypeId)) && o.purposeId == row.purposeMode.id
        }
    })
    let funding = purposeServiceType.length ? purposeServiceType[0].funding : null
    trip.funding = funding
    trip.tripOperationRecord = {
        requestId: requestId,
        tripId: null,
        status: 'Approved',
        action: "New Trip",
        remark: row.remarks,
        requestorName: row.requestorName,
        unitCode: row.conductingUnitCode,
    }
    return trip
}

const GetPreparkJobModel = function (requestId, tripNo, row, vehicle, recurringMode, purposeServiceTypeList) {
    let executionDate = moment(row.preparkDateTime).format('YYYY-MM-DD')
    let executionTime = moment(row.preparkDateTime).format('HH:mm')
    let trip = {
        requestId: requestId,
        tripNo: tripNo,
        referenceId: row.referenceId,
        status: 'Approved',
        resourceId: row.resourceId,
        vehicleType: vehicle.resourceType,
        noOfVehicle: Number(row.resourceQuantity),
        noOfDriver: Number(row.numberOfDriver),
        pocUnitCode: row.pocUnitCode,
        poc: row.pocName,
        pocNumber: row.pocMobileNumber,
        repeats: recurringMode.value,
        executionDate: executionDate,
        executionTime: executionTime,
        duration: null,
        endorse: 0,
        approve: 1,
        isImport: 0,
        completeCount: 0,
        driver: Number(row.numberOfDriver) == 0 ? 0 : 1,
        preParkDate: moment(row.preparkDateTime).format(fmt),
        periodStartDate: moment(row.startDateTime).format(fmt),
        periodEndDate: moment(row.endDateTime).format(fmt),
        tripRemarks: row.remarks,
        serviceModeId: vehicle.serviceModeId,
        serviceTypeId: vehicle.serviceTypeId,
        reEdit: 0,
        startsOn: executionDate,
        pickupDestination: row.pickupDestination.locationName,
        dropoffDestination: row.pickupDestination.locationName,
        pickupDestinationId: Number(row.reportingLocationId),
        dropoffDestinationId: Number(row.reportingLocationId),
        startDate: row.preparkDateTime,
        endDate: row.startDateTime,
    }
    let purposeServiceType = purposeServiceTypeList.filter(o => {
        if (o.serviceTypeId) {
            let serviceTypeIdList = o.serviceTypeId.split(',')
            serviceTypeIdList = serviceTypeIdList.map(Number)
            return serviceTypeIdList.includes(Number(trip.serviceTypeId)) && o.purposeId == row.purposeMode.id
        }
    })
    let funding = purposeServiceType.length ? purposeServiceType[0].funding : null
    trip.funding = funding
    trip.tripOperationRecord = {
        requestId: requestId,
        tripId: null,
        status: 'Approved',
        action: "New Trip",
        remark: row.remarks,
        requestorName: row.requestorName,
        unitCode: row.conductingUnitCode,
    }
    return trip
}

const GetCreateModel = async function (createDataList, unitCodeList, recurringModeList, serviceModeList, mobiusSubUnits, purposeServiceTypeList) {
    let indentList = []
    let autoAssignedTripNoList = []

    for (let row of createDataList) {
        let tripList = []
        let indent = GetRequestModel(row, unitCodeList)
        let requestId = indent.id
        let tripNo = requestId + '-001'

        let vehicle = row.vehicle
        let recurringMode = recurringModeList.find(o => o.service_mode_value == vehicle.serviceModeValue)

        let trip = GetJobModel(requestId, tripNo, row, vehicle, recurringMode, purposeServiceTypeList)
        let taskList = await GetTaskModel(trip, row, serviceModeList, mobiusSubUnits)
        trip.taskList = taskList
        tripList.push(trip)

        if (row.preparkDateTime) {
            let trip = GetPreparkJobModel(requestId, tripNo, row, vehicle, recurringMode, purposeServiceTypeList)
            let taskList = await GetTaskModel(trip, row, serviceModeList, mobiusSubUnits)
            trip.taskList = taskList
            tripList.push(trip)
        }
        indent.tripList = tripList

        indent.estimatedTripDuration = tripList.reduce((total, obj) => total + Number(obj.duration), 0)
        indent.noOfTrips = tripList.length
        indentList.push(indent)

        if (row.vehicle.group == 'M') {
            autoAssignedTripNoList.push(tripNo)
        }
    }
    return { indentList, autoAssignedTripNoList }
}

const GetTaskModel = async function (trip, row, serviceModeList, mobiusSubUnits) {
    let taskQty = trip.noOfVehicle == 0 ? trip.noOfDriver : trip.noOfVehicle

    let taskList = []
    for (let i = 0; i < taskQty; i++) {

        let mobiusUnitId = mobiusSubUnits[0].id
        let selectableTspStr = null

        if (row.vehicle.group == 'C') {
            let serviceMode = serviceModeList.find(o => o.id == Number(trip.serviceModeId))
            let tspList = await FilterServiceProvider(trip.vehicleType, serviceMode, trip.pickupDestination, trip.dropoffDestination, trip.executionDate, trip.executionTime)
            selectableTspStr = tspList.map(o => o.id).join(',');
        } else if (row.vehicle.group == 'M') {
            for (let item of mobiusSubUnits) {
                if (item.group) {
                    let unitGroupArray = item.group.split(',');
                    let existGroup = unitGroupArray.find(temp => temp.toLowerCase() == row.conductingUnitCode.toLowerCase());
                    if (existGroup) {
                        mobiusUnitId = item.id
                        break
                    }
                }
            }
        }

        let trackingId = GetTrackingId(trip.tripNo)

        let startDate = FormatToUtcOffset8(trip.startDate)
        let endDate = FormatToUtcOffset8(trip.endDate)

        let sendData = GetSendJobJson(row.trainingActivityName, {
            username: row.requestorName,
            contactNumber: "",
            email: "",
        }, trip.pickupDestination, trip.dropoffDestination, row.serviceMode, row.conductingUnitCode, "", {
            startTime: startDate,
            endTime: endDate,
            contactPerson: row.pocName,
            contactNumber: row.pocMobileNumber,
            typeOfVehicle: trip.vehicleType,
            trackingId: trackingId,
            indentId: trip.requestId.substr(0, 5) + trackingId,
            pickupNotes: "",
            dropoffNotes: ""
        })
        let executionDate = moment(trip.startDate).format('YYYY-MM-DD')
        let executionTime = moment(trip.startDate).format('HH:mm')
        let task = {
            requestId: trip.requestId,
            tripId: null,
            startDate: startDate,
            endDate: endDate,
            pickupDestination: trip.pickupDestination,
            dropoffDestination: trip.dropoffDestination,
            poc: row.pocName,
            pocNumber: row.pocMobileNumber,
            executionDate: executionDate,
            executionTime: executionTime,
            duration: trip.duration,
            selectableTsp: selectableTspStr,
            taskStatus: 'unassigned',
            success: 0,
            sendData: JSON.stringify(sendData),
            trackingId: trackingId,
            driverNo: i + 1,
            mobiusUnit: mobiusUnitId,
            funding: trip.funding,
        }
        task.taskOperationRecord = {
            requestId: task.requestId,
            tripId: null,
            status: 'unassigned',
            action: "unassigned",
            remark: '',
            requestorName: row.requestorName,
            unitCode: row.conductingUnitCode,
        }
        taskList.push(task)
    }
    return taskList
}

const GetUpdateModel = async function (updateDataList, recurringModeList, serviceModeList, mobiusSubUnits, purposeServiceTypeList) {
    if (updateDataList.length == 0) {
        return { newJobList: [], needCreateTSPList: [], needCancelTSPList: [], needDeleteTaskIdList: [], needDeleteTripIdList: [], updateCancelTaskAcceptIdList: [], errorUpdateReqAckList: [], autoAssignedTripNoList: [] }
    }

    let tripNoList = updateDataList.map(o => o.tripId)

    let jobList = await Job2.findAll({
        where: {
            tripNo: {
                [Op.in]: tripNoList
            }
        }
    })
    let existUpdateDataList = []
    let errorUpdateReqAckList = []
    for (let row of updateDataList) {
        let tripRow = jobList.find(o => o.tripNo == row.tripId)
        if (!tripRow) {
            errorUpdateReqAckList.push({
                referenceId: row.referenceId,
                lineNumber: row.lineNumber,
                errorCode: ErrorEnum.NGTS_Trip_ID_NOTEXIST.code,
                errorMessage: ErrorEnum.NGTS_Trip_ID_NOTEXIST.message
            })
        } else {
            tripRow.csvRow = row
            existUpdateDataList.push(tripRow)
            // if (row.preParkDate) {
            //     let tripRow2 = jobList.find(o => o.tripNo == row.tripId && o.id != tripRow.id)
            //     tripRow2.csvRow = row
            //     existUpdateDataList.push(tripRow2)
            // }
        }
    }

    if (existUpdateDataList.length == 0) {
        return { newJobList: [], needCreateTSPList: [], needCancelTSPList: [], needDeleteTaskIdList: [], needDeleteTripIdList: [], updateCancelTaskAcceptIdList: [], errorUpdateReqAckList, autoAssignedTripNoList: [] }
    }

    let alreadySendDataTasks = []
    let needCancelTSPList = []
    let updateCancelTaskAcceptIdList = []

    let cannotEditTripNoList = [] // req ack
    let needEditTripNoList = []
    let needDeleteTaskIdList = []
    let needDeleteTripIdList = []

    log.info(JSON.stringify(existUpdateDataList, "existUpdateDataList", 2))
    let serviceTypeList = await ServiceType.findAll()
    for (let row of existUpdateDataList) {
        let tasks = await Task2.findAll({
            // attributes: ['id', 'tripId', 'mobileStartTime', 'externalJobId', 'serviceProviderId'],
            where: {
                tripId: row.id
            }
        })

        let serviceType = serviceTypeList.find(o => o.id == row.serviceTypeId)
        if (serviceType.category.toLowerCase() != 'mv') {
            // CV started cannot edit
            let length = tasks.filter(o => o.mobileStartTime != null).length
            if (length) {
                cannotEditTripNoList.push({ tripNo: row.tripNo, error: 1 })
                continue
            } else {
                let records = tasks.filter(a => a.externalJobId != null)
                if (records.length > 0) {
                    alreadySendDataTasks.push(...records)
                }
            }
        } else {
            let strTaskIdArray = tasks.map(a => a.id.toString())
            let length = tasks.filter(o => o.mobileStartTime != null).length
            // MV started cannot edit
            if (length && row.driver) {
                cannotEditTripNoList.push({ tripNo: row.tripNo, error: 1 })
                continue
            }
            let exist = await GetIfLoanMVTaskStartByTaskIdArray(strTaskIdArray)
            if (exist) {
                cannotEditTripNoList.push({ tripNo: row.tripNo, error: 2 })
                continue
            }
        }

        // need cancel tasks
        if (serviceType.category.toLowerCase() != 'mv') {
            for (let task of tasks) {
                let { id, externalJobId, serviceProviderId } = task

                if (externalJobId) {
                    needCancelTSPList.push(externalJobId)
                } else if (serviceProviderId == -1) {
                    let wogTasks = await TaskAccept.findAll({
                        where: {
                            taskId: id,
                            status: {
                                [Op.ne]: 'Cancelled',
                            }
                        }
                    })
                    for (let wogTask of wogTasks) {
                        needCancelTSPList.push(wogTask.externalJobId)
                        updateCancelTaskAcceptIdList.push(wogTask.id)
                    }
                }
            }
        }
        // if (!row.preParkDate || row.preParkDate && row.preParkDate != `${row.executionDate} ${row.executionTime}`) {
        row.oldTaskList = tasks
        // }

        if (row.preParkDate) {
            let tripRow2 = jobList.find(o => o.tripNo == row.tripNo && o.id != row.id)
            let tasks = await Task2.findAll({
                where: {
                    tripId: tripRow2.id
                }
            })
            needDeleteTaskIdList.push(...tasks.map(a => a.id))
            needDeleteTripIdList.push(tripRow2.id)
            row.preparkJob = tripRow2
            row.preparkJob.oldTaskList = tasks
        }
        needEditTripNoList.push(row)

        needDeleteTaskIdList.push(...tasks.map(a => a.id))
        needDeleteTripIdList.push(row.id)
    }

    for (let item of cannotEditTripNoList) {
        let { tripNo, error } = item
        let row = updateDataList.find(o => o.tripId == tripNo)
        if (row) {
            errorUpdateReqAckList.push({
                referenceId: row.referenceId,
                lineNumber: row.lineNumber,
                errorCode: error == 1 ? ErrorEnum.Task_Already_Start_Error.code : ErrorEnum.MVTask_Assigned_Error.code,
                errorMessage: error == 1 ? ErrorEnum.Task_Already_Start_Error.message : ErrorEnum.MVTask_Assigned_Error.message,
            })
        }
    }

    let { newJobList, needCreateTSPList, autoAssignedTripNoList } = await GetEditJobModel(needEditTripNoList, alreadySendDataTasks, recurringModeList, serviceModeList, mobiusSubUnits, purposeServiceTypeList)

    let result = { newJobList, needCreateTSPList, needCancelTSPList, needDeleteTaskIdList, needDeleteTripIdList, updateCancelTaskAcceptIdList, errorUpdateReqAckList, autoAssignedTripNoList }
    log.info(JSON.stringify(result, 'updateResult', 2))
    return result
}

const GetEditJobModel = async function (needEditTripNoList, alreadySendDataTasks, recurringModeList, serviceModeList, mobiusSubUnits, purposeServiceTypeList) {
    let newJobList = []
    let needCreateTSPList = []
    let autoAssignedTripNoList = []
    let serviceProviderAll = await ServiceProvider.findAll()
    for (let job of needEditTripNoList) {
        let row = job.csvRow
        let requestId = job.requestId
        let tripNo = job.tripNo
        let vehicle = row.vehicle
        let recurringMode = recurringModeList.find(o => o.service_mode_value == vehicle.serviceModeValue)

        let trip = GetJobModel(requestId, tripNo, row, vehicle, recurringMode, purposeServiceTypeList)
        trip.id = job.id
        trip.oldJobHistory = job
        trip.tripOperationRecord = {
            requestId: requestId,
            tripId: job.id,
            status: 'Approved',
            action: "Edit Trip",
            remark: row.remarks,
            requestorName: row.requestorName,
            unitCode: row.conductingUnitCode,
        }
        let taskList = await GetTaskModel(trip, row, serviceModeList, mobiusSubUnits)
        taskList.forEach(o => { o.tripId = job.id })

        let existTSPTaskList = alreadySendDataTasks.filter(o => o.tripId == job.id)
        if (existTSPTaskList.length) {
            let serviceMode = serviceModeList.find(o => o.id == Number(vehicle.serviceModeId))
            let { newTaskList, createTSPList } = await getAlreadSendTasks(taskList, existTSPTaskList, vehicle.resourceType, serviceMode, tripNo, serviceProviderAll, {
                requestorName: row.requestorName,
                unitCode: row.conductingUnitCode,
            })
            needCreateTSPList.push(...createTSPList)
            trip.taskList = newTaskList
        } else {
            trip.taskList = taskList
        }
        newJobList.push(trip)

        if (row.preparkDateTime) {
            let oldOperationHistoryList = await OperationHistory.findAll({
                where: {
                    requestId: requestId,
                    tripId: job.id,
                    taskId: {
                        [Op.eq]: null
                    }
                }
            })
            let trip = GetPreparkJobModel(requestId, tripNo, row, vehicle, recurringMode, purposeServiceTypeList)
            trip.oldOperationHistoryList = oldOperationHistoryList.map(o => {
                return {
                    requestId: requestId,
                    tripId: null,
                    status: o.status,
                    action: o.action,
                    operatorId: o.operatorId,
                    remark: o.remarks,
                    requestorName: row.requestorName,
                    unitCode: row.conductingUnitCode,
                    createdAt: o.createdAt,

                }
            })
            trip.tripOperationRecord = {
                requestId: requestId,
                tripId: null,
                status: 'Approved',
                action: "Edit Trip",
                remark: row.remarks,
                requestorName: row.requestorName,
                unitCode: row.conductingUnitCode,
            }
            let taskList = await GetTaskModel(trip, row, serviceModeList, mobiusSubUnits)
            taskList.forEach(o => { o.tripId = job.id })
            trip.taskList = taskList
            newJobList.push(trip)
        }
        if (vehicle.group == 'M') {
            autoAssignedTripNoList.push(tripNo)
        }
    }
    return { newJobList, needCreateTSPList, autoAssignedTripNoList }
}

const getAlreadSendTasks = async function (taskList, alreadySendDataTasks, typeOfVehicle, serviceMode, tripNo, serviceProviderAll, requestor) {
    let createTSPList = []
    let sendTSPTaskList = taskList.slice(0, alreadySendDataTasks.length)
    let notSendTSPTaskList = taskList.slice(alreadySendDataTasks.length)
    let index = 0
    for (let row of sendTSPTaskList) {
        let sendDataTask = alreadySendDataTasks[index]
        log.info(JSON.stringify(sendDataTask, 'sendDataTask', 2))
        row.externalJobId = sendDataTask.externalJobId
        row.externalTaskId = sendDataTask.externalTaskId
        row.serviceProviderId = sendDataTask.serviceProviderId
        row.tspChangeTime = sendDataTask.tspChangeTime
        row.notifiedTime = sendDataTask.notifiedTime
        row.success = sendDataTask.success
        row.guid = sendDataTask.guid
        row.jobStatus = sendDataTask.jobStatus
        row.returnData = sendDataTask.returnData

        let dropoffDestination = row.dropoffDestination
        let pickupDestination = row.pickupDestination
        let executionDate = row.executionDate
        let executionTime = row.executionTime
        let serviceProviderId = sendDataTask.serviceProviderId
        let trackingId = GetTrackingId(tripNo)

        let sendData = JSON.parse(row.sendData)
        let tasks_attributes = sendData.job.tasks_attributes[0]
        tasks_attributes.tracking_id = trackingId
        let custom_fields_attributes = tasks_attributes.custom_fields_attributes
        for (var item of custom_fields_attributes) {
            if (item.custom_field_description_id == conf.CreateJobJsonField.TrackingIdField) {
                item.value = trackingId
            }
        }
        row.trackingId = trackingId
        row.sendData = JSON.stringify(sendData)

        let serviceProviderList = await FilterServiceProvider(typeOfVehicle, serviceMode, dropoffDestination, pickupDestination, executionDate, executionTime)
        // log.info(JSON.stringify(serviceProviderList, null, 2))

        row.selectableTsp = serviceProviderList.map(a => a.id).join(',')
        let tsp = serviceProviderList.find(item => item.id == serviceProviderId)
        if (tsp) {
            row.contractPartNo = tsp.contractPartNo
            let serviceProvider = serviceProviderAll.find(o => o.id == serviceProviderId)
            row.allocateeId = serviceProvider.allocateeId
            createTSPList.push({ trackingId: row.trackingId, allocateeId: row.allocateeId, tspName: tsp.name, requestor })
        }
        index += 1
    }
    let newTaskList = sendTSPTaskList.concat(...notSendTSPTaskList)
    return { newTaskList, createTSPList }
}

const GetCancelModel = async function (cancelDataList) {
    let errorCancelReqAckList = []
    let newCancelDataList = []

    // endtime expired cannot cancel
    let now = moment()
    for (let o of cancelDataList) {
        if (moment(o.endDateTime).isSameOrBefore(now)) {
            errorCancelReqAckList.push({
                referenceId: o.referenceId,
                lineNumber: o.lineNumber,
                errorCode: ErrorEnum.EndDateTime_Expired_Error.code,
                errorMessage: ErrorEnum.EndDateTime_Expired_Error.message
            })
        } else {
            newCancelDataList.push(o)
        }
    }
    cancelDataList = newCancelDataList

    if (cancelDataList.length == 0) {
        return { needCancelTrips: [], sendCancelJobList: [], updateCancelTaskAcceptIdList: [], errorCancelReqAckList: [] }
    }
    let referenceIdList = cancelDataList.map(o => o.referenceId)

    let cancelledAtmsTaskList = await sequelizeSystemObj.query(
        `select id as tripId, requestId, referenceId, serviceModeId, serviceTypeId, driver from job where referenceId in (?)`,
        {
            replacements: [referenceIdList],
            type: QueryTypes.SELECT,
        }
    )
    let existNgtsTripIdList = [...new Set(cancelledAtmsTaskList.map(o => o.referenceId))]
    for (let o of cancelDataList) {
        if (existNgtsTripIdList.indexOf(o.referenceId) == -1) {
            errorCancelReqAckList.push({
                referenceId: o.referenceId,
                lineNumber: o.lineNumber,
                errorCode: ErrorEnum.ATMs_Reference_ID_NOTEXIST.code,
                errorMessage: ErrorEnum.ATMs_Reference_ID_NOTEXIST.message
            })
        }
    }

    let serviceTypeList = await ServiceType.findAll()
    let checkMVTrips = []
    let needCancelTrips = []
    let needCancelTripIds = []

    let cannotCancelTrips = []
    let needDeleteMVTasksId = []

    for (let row of cancelledAtmsTaskList) {
        let serviceTypeObj = serviceTypeList.find(o => o.id == Number(row.serviceTypeId))
        if (serviceTypeObj.category.toLowerCase() == 'mv') {
            checkMVTrips.push(row)
        } else {
            let tasks = await Task2.findAll({
                where: {
                    tripId: row.tripId
                }
            })
            row.tasks = tasks
            needCancelTripIds.push(row.tripId)
        }
    }

    for (let row of checkMVTrips) {
        let tasks = await Task2.findAll({
            where: {
                tripId: row.tripId
            }
        })
        if (tasks.length > 0) {
            let strTaskIdArray = tasks.map(a => a.id.toString())
            let length = tasks.filter(o => row.mobileStartTime != null).length
            if (length && row.driver) {
                cannotCancelTrips.push(row)
            } else {
                row.tasks = tasks
                needCancelTripIds.push(row.tripId)
                needDeleteMVTasksId.push(...strTaskIdArray)
            }

            let exist = await GetIfLoanMVTaskStartByTaskIdArray(strTaskIdArray)
            if (exist) {
                cannotCancelTrips.push(row)
            } else {
                row.tasks = tasks
                needCancelTripIds.push(row.tripId)
            }
        }
    }

    needCancelTripIds = [...new Set(needCancelTripIds)]
    needCancelTrips = cancelledAtmsTaskList.filter(o => needCancelTripIds.indexOf(o.tripId) != -1)
    let tspList = await ServiceProvider.findAll()
    let sendCancelJobList = []
    let updateCancelTaskAcceptIdList = []
    for (let trip of needCancelTrips) {
        let cancelCSVData = cancelDataList.find(o => o.referenceId == trip.referenceId)
        trip.requestorName = cancelCSVData.requestorName
        trip.cancelldTime = cancelCSVData.transacationDateTime
        trip.unitCode = cancelCSVData.conductingUnitCode
        trip.jobOperationRecord = {
            requestId: trip.requestId,
            tripId: trip.tripId,
            status: 'cancelled',
            action: "Cancel",
            remark: cancelCSVData.remarks,
            requestorName: cancelCSVData.requestorName,
            unitCode: cancelCSVData.conductingUnitCode,
        }
        for (let task of trip.tasks) {
            let { id, externalJobId, serviceProviderId } = task
            if (externalJobId != null) {
                sendCancelJobList.push(externalJobId)
                let tsp = tspList.find(o => o.id == serviceProviderId)
                if (tsp) {
                    task.taskOperationRecord = {
                        requestId: task.requestId,
                        tripId: task.tripId,
                        taskId: task.id,
                        status: `Cancel TSP`,
                        action: `Cancel TSP`,
                        remark: tsp.name,
                        createdAt: cancelCSVData.transacationDateTime,
                        requestorName: cancelCSVData.requestorName,
                        unitCode: cancelCSVData.conductingUnitCode,
                    }
                }
            } else if (serviceProviderId == -1) {
                let wogTasks = await TaskAccept.findAll({
                    where: {
                        taskId: id,
                        status: {
                            [Op.ne]: 'Cancelled',
                        }
                    }
                })
                for (let wogTask of wogTasks) {
                    sendCancelJobList.push(wogTask.externalJobId)
                    updateCancelTaskAcceptIdList.push(wogTask.id)
                }
                task.taskOperationRecord = {
                    requestId: task.requestId,
                    tripId: task.tripId,
                    taskId: task.id,
                    status: `Cancel TSP`,
                    action: `Cancel TSP`,
                    remark: 'WOG',
                    createdAt: cancelCSVData.transacationDateTime,
                    requestorName: cancelCSVData.requestorName,
                    unitCode: cancelCSVData.conductingUnitCode,
                }
            }

        }
    }
    for (let row of cannotCancelTrips) {
        let csvData = cancelDataList.find(o => o.referenceId == row.referenceId)
        errorCancelReqAckList.push({
            referenceId: csvData.referenceId,
            lineNumber: csvData.lineNumber,
            errorCode: ErrorEnum.Task_Already_Start_Error.code,
            errorMessage: ErrorEnum.Task_Already_Start_Error.message
        })
    }
    await SendNotificationAndDelTask(needDeleteMVTasksId, "cancel")

    return { needCancelTrips, sendCancelJobList, updateCancelTaskAcceptIdList, errorCancelReqAckList }
}

const GetIfLoanMVTaskStartByTaskIdArray = async function (taskIdArray) {
    let rows = await sequelizeServerObj.query(
        `SELECT taskId FROM loan WHERE taskId in (?)
        UNION 
        SELECT taskId FROM loan_record WHERE taskId in (?);`,
        {
            replacements: [taskIdArray, taskIdArray],
            type: QueryTypes.SELECT,
        }
    );
    let count = rows.length
    return count > 0
}

const SendNotificationAndDelTask = async function (taskIds, type) {
    const GetMobiusTaskByTaskIdArray = async function (taskIdArray) {
        return await sequelizeServerObj.query(
            `select taskId, driverId, vehicleNumber, purpose from task where dataFrom = 'SYSTEM' and taskId in (?);`,
            {
                replacements: [taskIdArray],
                type: QueryTypes.SELECT,
            }
        );
    }

    const DeleteMobiusTaskByTaskIdArray = async function (taskIdArray) {
        await sequelizeServerObj.query(
            `delete from task WHERE taskId in (?);`,
            {
                replacements: [taskIdArray],
                type: QueryTypes.DELETE,
            }
        );
    }

    const UpdateMobiusTaskByTaskIdArray = async function (taskIdArray) {
        await sequelizeServerObj.query(
            `update task set driverStatus = 'Cancelled', vehicleStatus = 'Cancelled' WHERE taskId in (?);`,
            {
                replacements: [taskIdArray],
                type: QueryTypes.UPDATE,
            }
        );
    }

    if (taskIds.length > 0) {
        taskIds = taskIds.map(value => "AT-" + value)
        // Add NOTIFICATION
        let taskList = await GetMobiusTaskByTaskIdArray(taskIds)
        taskList = taskList.filter(a => a.driverId != null)
        if (type == "edit") {
            await utils.SendDataToFirebase(taskList, 'Task update!')
            await DeleteMobiusTaskByTaskIdArray(taskIds)
        } else if (type == "cancel") {
            await utils.SendDataToFirebase(taskList, 'Task cancel!')
            await UpdateMobiusTaskByTaskIdArray(taskIds)
        }
    }
}

const SaveReqAckFile = async function (dateformat) {
    let ngtsReqAckList = await sequelizeSystemObj.query(
        `select * from ngts_req_ack where isSend = 'N'`,
        {
            type: QueryTypes.SELECT,
        }
    )
    let ngtsReqAckDatas = ngtsReqAckList.map(o => {
        return [o.lineNumber, o.errorCode]
    })
    ngtsReqAckDatas.unshift([Prefix.Header, ngtsReqAckDatas.length]);

    let filename = NGTSFilenamePrefix.NGTS_REQ_ACK + dateformat + '.csv'
    await csvUtil.write(filename, ngtsReqAckDatas)

    return filename
}
module.exports.SaveReqAckFile = SaveReqAckFile

const SaveRespFile = async function (dateformat) {
    let ngtsRespList = await sequelizeSystemObj.query(
        `select * from ngts_resp where isSend = 'N'`,
        {
            type: QueryTypes.SELECT,
        }
    )
    let ngtsRespDatas = ngtsRespList.map(o => {
        return [
            o.ngtsTripId,
            o.referenceId,
            o.transacationType,
            convertDateTimeStr(o.transacationDateTime),
            o.responseStatus,
            o.serviceMode,
            o.resourceId,
            o.resourceQuantity,
            convertDateTimeStr(o.startDateTime),
            convertDateTimeStr(o.endDateTime),
            o.pocUnitCode,
            o.pocName,
            o.pocMobileNumber,
            o.reportingLocationId,
            o.destinationLocationId,
            o.preparkQuantity,
            convertDateTimeStr(o.preparkDateTime),
            o.ngtsJobId,
            o.ngtsJobStatus,
            o.driverName,
            o.driverMobileNumber,
            o.vehicleNumber
        ]
    })
    ngtsRespDatas.push([Prefix.Footer, ngtsRespDatas.length]);

    let filename = NGTSFilenamePrefix.NGTS_RESP + dateformat + '.csv'
    await csvUtil.write(filename, ngtsRespDatas)

    return filename
}
module.exports.SaveRespFile = SaveRespFile

module.exports.updateRespSendData = async function () {
    await NGTSResp.update({
        isSend: 'Y'
    }, {
        where: {
            isSend: 'N'
        }
    })
}

module.exports.updateReqAckSendData = async function () {
    await NGTSReqAck.update({
        isSend: 'Y'
    }, {
        where: {
            isSend: 'N'
        }
    })
}


const FilterServiceProvider = async function (vehicle, serviceMode, dropoffPoint, pickupPoint, executionDate, executionTime, wog = false) {
    let wogFilter = wog ? " and c.type = 'WOG' " : ""
    let chargeType = []
    if (serviceMode.chargeType.indexOf(',') != -1) {
        chargeType = serviceMode.chargeType.split(',')
    } else {
        if (serviceMode.chargeType == ChargeType.MIX) {
            chargeType = [ChargeType.DAILY, ChargeType.WEEKLY, ChargeType.MONTHLY, ChargeType.YEARLY]
        } else if (serviceMode.chargeType == ChargeType.TRIP) {
            chargeType = [ChargeType.TRIP, ChargeType.DAILYTRIP]
        } else if (serviceMode.chargeType == ChargeType.BLOCKDAILY) {
            chargeType = [ChargeType.BLOCKDAILY, ChargeType.BLOCKDAILY_1, ChargeType.BLOCKDAILY_2]
        } else {
            chargeType = [serviceMode.chargeType]
        }
    }
    let dailyTripFilter = ""
    if (chargeType.indexOf(ChargeType.DAILYTRIP) != -1) {
        dailyTripFilter = `and (
            dailyTripCondition is null 
            or 
            dailyTripCondition is not null and 
            (
                SUBSTRING_INDEX(d.dailyTripCondition,'-',1) < SUBSTRING_INDEX(d.dailyTripCondition,'-',-1) and
                CONCAT('2020-01-01',' ','${executionTime}') BETWEEN CONCAT('2020-01-01',' ',SUBSTRING_INDEX(d.dailyTripCondition,'-',1)) and CONCAT('2020-01-01',' ',SUBSTRING_INDEX(d.dailyTripCondition,'-',-1))
                or 
                SUBSTRING_INDEX(d.dailyTripCondition,'-',1) > SUBSTRING_INDEX(d.dailyTripCondition,'-',-1) and
                CONCAT('2020-01-02',' ','${executionTime}') BETWEEN CONCAT('2020-01-01',' ',SUBSTRING_INDEX(d.dailyTripCondition,'-',1)) and CONCAT('2020-01-02',' ',SUBSTRING_INDEX(d.dailyTripCondition,'-',-1))
                or 
                SUBSTRING_INDEX(d.dailyTripCondition,'-',1) > SUBSTRING_INDEX(d.dailyTripCondition,'-',-1) and
                CONCAT('2020-01-01',' ','${executionTime}') BETWEEN CONCAT('2020-01-01',' ',SUBSTRING_INDEX(d.dailyTripCondition,'-',1)) and CONCAT('2020-01-02',' ',SUBSTRING_INDEX(d.dailyTripCondition,'-',-1))
            )
        )`
    }
    log.info([vehicle, serviceMode.id, serviceMode.id, dropoffPoint, pickupPoint, chargeType, executionTime, executionTime, executionTime])
    let data = await sequelizeSystemObj.query(
        `SELECT
            a.serviceProviderId as id, e.name, c.contractNo, 
            GROUP_CONCAT(d.contractPartNo) as contractPartNo, d.typeOfVehicle, c.type, c.category,c.maxTrips, c.endPoint, e.availableTime, d.dailyTripCondition, 
            GROUP_CONCAT(d.chargeType) as chargeType
        FROM contract a 
        LEFT JOIN contract_detail c on a.contractNo = c.contractNo
        LEFT JOIN contract_rate d ON c.contractPartNo = d.contractPartNo
        LEFT JOIN service_provider e on a.serviceProviderId = e.id
        where d.status = 'Approved' and d.isInvalid != 1 and d.typeOfVehicle = ? and FIND_IN_SET(?, a.serviceModeId) and FIND_IN_SET(?, d.serviceModeId)
        and (c.endPoint = 'ALL' or FIND_IN_SET(?, c.endPoint)) 
        and (c.startPoint = 'ALL' or FIND_IN_SET(?, c.startPoint)) 
        and d.chargeType in (?)
        and (
            SUBSTRING_INDEX(e.availableTime,'-',1) < SUBSTRING_INDEX(e.availableTime,'-',-1) and
            CONCAT('2020-01-01',' ',?) BETWEEN CONCAT('2020-01-01',' ',SUBSTRING_INDEX(e.availableTime,'-',1)) and CONCAT('2020-01-01',' ',SUBSTRING_INDEX(e.availableTime,'-',-1))
            or 
            SUBSTRING_INDEX(e.availableTime,'-',1) > SUBSTRING_INDEX(e.availableTime,'-',-1) and
            CONCAT('2020-01-02',' ',?) BETWEEN CONCAT('2020-01-01',' ',SUBSTRING_INDEX(e.availableTime,'-',1)) and CONCAT('2020-01-02',' ',SUBSTRING_INDEX(e.availableTime,'-',-1))
            or 
            SUBSTRING_INDEX(e.availableTime,'-',1) > SUBSTRING_INDEX(e.availableTime,'-',-1) and
            CONCAT('2020-01-01',' ',?) BETWEEN CONCAT('2020-01-01',' ',SUBSTRING_INDEX(e.availableTime,'-',1)) and CONCAT('2020-01-02',' ',SUBSTRING_INDEX(e.availableTime,'-',-1))
        )
        and '${executionDate}' between a.startDate and IFNULL(a.extensionDate,a.endDate)
        and '${executionDate}' between c.startDate and c.endDate
        ${dailyTripFilter}
        ${wogFilter} GROUP BY e.id, c.endPoint, a.contractNo`,
        {
            replacements: [vehicle, serviceMode.id, serviceMode.id, dropoffPoint, pickupPoint, chargeType, executionTime, executionTime, executionTime],
            type: QueryTypes.SELECT
        }
    );

    if (serviceMode.chargeType == ChargeType.TRIP) {
        data = data.filter(item => {
            return (item.dailyTripCondition == null || item.dailyTripCondition != null && IsPeak(executionTime, item.dailyTripCondition))
        })
    }

    let endPointFilterWithAll = data.filter(item => item.endPoint.toLowerCase() == 'all')
    let endPointFilterNotWithAll = data.filter(item => item.endPoint.toLowerCase() != 'all')
    let noExistAll = []
    for (let row of endPointFilterWithAll) {
        let id = row.id
        let typeOfVehicle = row.typeOfVehicle
        let count = endPointFilterNotWithAll.filter(item => item.id == id && item.typeOfVehicle == typeOfVehicle).length
        if (count == 0) {
            noExistAll.push(row)
        }
    }
    let result = endPointFilterNotWithAll.concat(noExistAll)
    result = result.sort((a, b) => { return (a.name > b.name) ? 1 : -1 });
    return result
}

const IsPeak = function (executionTime, peakTime) {
    let fmt = "HH:mm"
    let fmt1 = "YYYY-MM-DD HH:mm"
    if (peakTime) {
        let peakTimes = peakTime.split(',')
        let isPeak = peakTimes.find(item => {
            let times = item.split('-')
            let time0 = times[0]
            let time1 = times[1]
            let timeDiff = moment(time0, 'HH:mm').diff(moment(time1, 'HH:mm'), 's')
            if (timeDiff <= 0) {
                return moment(executionTime, fmt).diff(moment(time0, fmt), 'm') >= 0 && moment(time1, fmt).diff(moment(executionTime, fmt), 'm') >= 0
            } else {
                return moment("2020-01-02 " + executionTime, fmt1).diff(moment("2020-01-01 " + time0, fmt1), 'm') >= 0
                    && moment("2020-01-02 " + time1, fmt1).diff(moment("2020-01-02 " + executionTime, fmt1), 'm') >= 0
                    ||
                    moment("2020-01-01 " + executionTime, fmt1).diff(moment("2020-01-01 " + time0, fmt1), 'm') >= 0
                    && moment("2020-01-02 " + time1, fmt1).diff(moment("2020-01-01 " + executionTime, fmt1), 'm') >= 0
            }
        })
        return isPeak ? true : false
    }
    return false
}

const GetSendJobJson = function (additionalRemarks, user, pickUpLocation, dropOffLocation, serviceMode, groupName, poNumber, task) {
    const fmt2 = "dddd, DD/MM/YYYY HH:mm"

    let sendJob = JSON.parse(JSON.stringify(CreateJobJson));
    // sendJob.job.job_type = job.typeOfRequest
    let startTime = task.startTime
    let endTime = task.endTime == "" ? startTime : task.endTime
    let remarks = `${task.pickupNotes ?? ""} ${task.dropoffNotes ?? ""}`

    sendJob.job.remarks = remarks
    sendJob.job.customer_attributes.name = groupName

    sendJob.job.base_task_attributes.time_from = startTime
    sendJob.job.base_task_attributes.time_to = endTime

    sendJob.job.base_task_attributes.address_attributes.line_1 = dropOffLocation.locationName
    sendJob.job.base_task_attributes.address_attributes.zip = dropOffLocation.zip
    sendJob.job.base_task_attributes.address_attributes.country = dropOffLocation.country
    sendJob.job.base_task_attributes.address_attributes.latitude = dropOffLocation.lat
    sendJob.job.base_task_attributes.address_attributes.longitude = dropOffLocation.lng
    sendJob.job.base_task_attributes.address_attributes.contact_person = user.username
    sendJob.job.base_task_attributes.address_attributes.contact_number = user.contactNumber
    sendJob.job.base_task_attributes.address_attributes.email = user.email

    sendJob.job.tasks_attributes[0].remarks = remarks
    sendJob.job.tasks_attributes[0].time_from = startTime
    sendJob.job.tasks_attributes[0].time_to = endTime
    sendJob.job.tasks_attributes[0].address_attributes.line_1 = pickUpLocation.locationName
    sendJob.job.tasks_attributes[0].address_attributes.zip = pickUpLocation.zip
    sendJob.job.tasks_attributes[0].address_attributes.country = pickUpLocation.country
    sendJob.job.tasks_attributes[0].address_attributes.latitude = pickUpLocation.lat
    sendJob.job.tasks_attributes[0].address_attributes.longitude = pickUpLocation.lng
    sendJob.job.tasks_attributes[0].address_attributes.contact_person = task.contactPerson
    sendJob.job.tasks_attributes[0].address_attributes.contact_number = "+65" + task.contactNumber
    sendJob.job.tasks_attributes[0].address_attributes.email = ""
    sendJob.job.tasks_attributes[0].tracking_id = task.trackingId

    let custom_fields_attributes = sendJob.job.tasks_attributes[0].custom_fields_attributes
    for (var item of custom_fields_attributes) {
        if (item.custom_field_description_id == conf.CreateJobJsonField.UserNameField) {
            item.value = user.username
        } else if (item.custom_field_description_id == conf.CreateJobJsonField.ContactNumberField) {
            item.value = user.contactNumber
        } else if (item.custom_field_description_id == conf.CreateJobJsonField.ResourceField) {
            item.value = task.typeOfVehicle
        } else if (item.custom_field_description_id == conf.CreateJobJsonField.ServiceModeField) {
            item.value = serviceMode
        } else if (item.custom_field_description_id == conf.CreateJobJsonField.TrackingIdField) {
            item.value = task.indentId
        } else if (item.custom_field_description_id == conf.CreateJobJsonField.ActivityNameField) {
            item.value = additionalRemarks
        } else if (item.custom_field_description_id == conf.CreateJobJsonField.StartTimeField) {
            item.value = moment(startTime).format(fmt2)
        } else if (item.custom_field_description_id == conf.CreateJobJsonField.EndTimeField) {
            item.value = moment(endTime).format(fmt2)
        } else if (item.custom_field_description_id == conf.CreateJobJsonField.PoNumberField) {
            item.value = poNumber
        }
    }
    return sendJob
}

const CopyRecordToHistory = async function (trip) {
    let createdJob = await Job2History.create({
        jobId: trip.id,
        requestId: trip.requestId,
        instanceId: trip.instanceId,
        contractPartNo: trip.contractPartNo,
        serviceProviderId: trip.serviceProviderId,
        status: trip.status,
        pickupDestination: trip.pickupDestination,
        pickupNotes: trip.pickupNotes,
        dropoffDestination: trip.dropoffDestination,
        dropoffNotes: trip.dropoffNotes,
        vehicleType: trip.vehicleType,
        noOfVehicle: trip.noOfVehicle,
        noOfDriver: trip.noOfDriver,
        poc: trip.poc,
        pocNumber: trip.pocNumber,
        repeats: trip.repeats,
        executionDate: trip.executionDate,
        executionTime: trip.executionTime,
        startsOn: trip.startsOn,
        endsOn: trip.endsOn,
        repeatsOn: trip.repeatsOn,
        duration: trip.duration,
        endorse: trip.endorse,
        approve: trip.approve,
        isImport: trip.isImport,
        completeCount: trip.completeCount,
        createdAt: trip.createdAt,
        updatedAt: trip.updatedAt,
        tripNo: trip.tripNo,
        driver: trip.driver,
        periodStartDate: trip.periodStartDate,
        periodEndDate: trip.periodEndDate,
        tripRemarks: trip.tripRemarks,
        createdBy: trip.createdBy,
        serviceModeId: trip.serviceModeId,
        serviceTypeId: trip.serviceTypeId,
        reEdit: trip.reEdit,
        pocCheckStatus: trip.pocCheckStatus,
        quantity: trip.quantity,
        polPoint: trip.polPoint,
        loaTagId: trip.loaTagId,
        referenceId: trip.referenceId,
        resourceId: trip.resourceId,
        pocUnitCode: trip.pocUnitCode,
        pickupDestinationId: trip.pickupDestinationId,
        dropoffDestinationId: trip.dropoffDestinationId,
    })
    let taskHistoryRecords = []
    for (let task of trip.oldTaskList) {
        taskHistoryRecords.push({
            jobHistoryId: createdJob.id,
            taskId: task.id,
            externalTaskId: task.externalTaskId,
            externalJobId: task.externalJobId,
            requestId: task.requestId,
            tripId: task.tripId,
            startDate: task.startDate,
            endDate: task.endDate,
            pickupDestination: task.pickupDestination,
            dropoffDestination: task.dropoffDestination,
            poc: task.poc,
            pocNumber: task.pocNumber,
            executionDate: task.executionDate,
            executionTime: task.executionTime,
            duration: task.duration,
            taskStatus: task.taskStatus,
            driverId: task.driverId,
            mobileStartTime: task.mobileStartTime,
            arrivalTime: task.arrivalTime,
            endTime: task.endTime,
            departTime: task.departTime,
            copyFrom: task.copyFrom,
            success: task.success,
            guid: task.guid,
            jobStatus: task.jobStatus,
            returnData: task.returnData,
            sendData: task.sendData,
            trackingId: task.trackingId,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            serviceProviderId: task.serviceProviderId,
            selectableTsp: task.selectableTsp,
            contractPartNo: task.contractPartNo,
            driverNo: task.driverNo,
            tspChangeTime: task.tspChangeTime,
            noMoreArbitrate: task.noMoreArbitrate,
            endorse: task.endorse,
            cancellationTime: task.cancellationTime,
            poNumber: task.poNumber,
            isChange: task.isChange,
            notifiedTime: task.notifiedTime,
            funding: task.funding,
            mobiusUnit: task.mobiusUnit,
            walletId: task.walletId,
        })
    }
    await JobTaskHistory2.bulkCreate(taskHistoryRecords)
    return createdJob.id
}
module.exports.CopyRecordToHistory = CopyRecordToHistory