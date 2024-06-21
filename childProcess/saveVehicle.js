
const log = require('../log/winston').logger('Save Vehicle ChildProcess');
const { VehicleCategory } = require('../model/server/vehicleCategory');
const { NGTSVehicle } = require('../model/system/ngtsVehicle');
const moment = require('moment');
const { sequelizeSystemObj } = require('../db/dbConf_system');
const { Sequelize, Op, QueryTypes } = require('sequelize');

function compareArrays(arr1, arr2) {
    let newarr1 = arr1.map(Number)
    let newarr2 = arr2.map(Number)
    for (let i = 0; i < newarr1.length; i++) {
        if (newarr2.includes(newarr1[i])) {
            return true;
        }
    }

    return false;
}

process.on('message', async processParams => {
    try {
        log.info(`\r\n`)
        log.info(`-------------------Start Save NGTS Vehicle-------------------`)

        await saveVehicle()

        log.info(`-------------------End Save NGTS Vehicle-------------------`)
        log.info(`\r\n`)

        process.send({ success: true })
    } catch (error) {
        log.error(error);
        process.send({ success: false, error })
    }
})

const saveVehicle = async function () {
    let cvVehicleList = await sequelizeSystemObj.query(
        `SELECT
            DISTINCT a.serviceModeId, c.typeOfVehicle, c.\`status\`, c.isInvalid, a.startDate, a.endDate, a.extensionDate
        FROM
            contract a
        LEFT JOIN contract_detail b ON a.contractNo = b.contractNo
        LEFT JOIN contract_rate c on b.contractPartNo = c.contractPartNo 
        WHERE a.serviceModeId is not null;`,
        {
            type: QueryTypes.SELECT,
        }
    )
    let vehicleSubGroupList = await sequelizeSystemObj.query(
        `SELECT
            a.id as serviceTypeId,
            a.\`name\` as serviceType,
            b.id as serviceModeId,
            b.\`name\` as serviceMode,
            b.\`value\` as serviceModeValue,
            a.category
        FROM
            service_type a
        LEFT JOIN service_mode b ON a.id = b.service_type_id;`,
        {
            type: QueryTypes.SELECT,
        }
    )
    let mvServiceModeIdList = vehicleSubGroupList.map(o => {
        if (o.category && o.category.toUpperCase() == 'MV') {
            return o.serviceModeId
        }
    })
    let mvVehicleList = await VehicleCategory.findAll({
        where: {
            belongTo: 'atms'
        }
    })

    let records = []
    cvVehicleList.forEach(row => {
        let { serviceModeId, typeOfVehicle, status, isInvalid, startDate, endDate, extensionDate } = row

        let vehicleStatus = 'A'
        let date = extensionDate ? extensionDate : endDate

        if (status != "Approved" || isInvalid || moment(moment().format('YYYY-MM-DD')).isBefore(moment(startDate))) {
            vehicleStatus = 'Delete'
        }
        else if (moment(moment().format('YYYY-MM-DD')).isAfter(moment(date))) {
            vehicleStatus = 'D'
        }
        let serviceModeList = serviceModeId.split(',')
        // CV
        if (!compareArrays(mvServiceModeIdList, serviceModeList)) {
            for (let serviceModeId of serviceModeList) {
                let obj = vehicleSubGroupList.find(o => Number(o.serviceModeId) == Number(serviceModeId))
                // log.info(JSON.stringify(record))
                if (!records.some(o => o.resourceType == typeOfVehicle && Number(o.serviceTypeId) == Number(obj.serviceTypeId) && Number(o.serviceModeId) == Number(obj.serviceModeId))) {
                    let record = {
                        resourceType: typeOfVehicle,
                        group: 'C',
                        serviceTypeId: obj.serviceTypeId,
                        serviceType: obj.serviceType,
                        serviceModeId: obj.serviceModeId,
                        serviceMode: obj.serviceMode,
                        serviceModeValue: obj.serviceModeValue,
                        status: vehicleStatus,
                        baseLineQty: 9999,
                    }
                    records.push(record)
                }
            }
        }
    })

    mvVehicleList.forEach(row => {
        let { vehicleName, category, status, baseLineQty, serviceMode } = row
        let vehicleStatus = status == "disable" ? 'D' : 'A'

        if (serviceMode) {
            let serviceModeList = serviceMode.split(',')
            for (let serviceMode of serviceModeList) {
                let obj = vehicleSubGroupList.find(o => o.serviceMode.toUpperCase() == serviceMode.toUpperCase()
                    && o.serviceType.toUpperCase() == category.toUpperCase())
                log.info(JSON.stringify(obj))
                if (obj) {
                    if (!records.some(o => o.resourceType == vehicleName && Number(o.serviceTypeId) == Number(obj.serviceTypeId) && Number(o.serviceModeId) == Number(obj.serviceModeId))) {
                        let record = {
                            resourceType: vehicleName,
                            group: 'M',
                            serviceTypeId: obj.serviceTypeId,
                            serviceType: obj.serviceType,
                            serviceModeId: obj.serviceModeId,
                            serviceMode: obj.serviceMode,
                            serviceModeValue: obj.serviceModeValue,
                            status: vehicleStatus,
                            baseLineQty: baseLineQty ? baseLineQty : 0,
                        }
                        records.push(record)
                    }
                } else {
                    log.info(`Cannot find service type: ${category}, service mode: ${serviceMode} in system.`)
                }
            }
        }

    })

    if (records.length) {
        const t = await sequelizeSystemObj.transaction();
        try {
            for (let row of records) {
                let { resourceType, group, serviceTypeId, serviceType, serviceModeId, serviceMode, serviceModeValue, status, baseLineQty } = row
                if (status == 'Delete') {
                    await NGTSVehicle.destroy({
                        where: {
                            resourceType: resourceType,
                            serviceTypeId: serviceTypeId,
                            serviceModeId: serviceModeId,
                        },
                        transaction: t
                    })
                    continue
                }

                let ngtsVehicle = await NGTSVehicle.findOne({
                    where: {
                        resourceType: resourceType,
                        serviceTypeId: serviceTypeId,
                        serviceModeId: serviceModeId,
                    }
                })
                if (ngtsVehicle) {
                    await NGTSVehicle.update({
                        serviceType: serviceType,
                        serviceTypeId: serviceTypeId,
                        serviceMode: serviceMode,
                        serviceModeId: serviceModeId,
                        status: status,
                        baseLineQty: baseLineQty,
                        group: group,
                        resourceType: resourceType,
                        serviceModeValue: serviceModeValue,
                    }, {
                        where: {
                            id: ngtsVehicle.id
                        },
                        transaction: t
                    })
                } else {
                    await NGTSVehicle.create(row, { transaction: t })
                }
            }
            await t.commit();
        } catch (error) {
            log.error(error)
            await t.rollback();
        }
    }
}

saveVehicle()