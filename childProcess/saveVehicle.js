
const log = require('../log/winston').logger('Save Vehicle ChildProcess');
const { VehicleCategory } = require('../model/server/vehicleCategory');
const { NGTSVehicle } = require('../model/system/ngtsVehicle');
const moment = require('moment');
const { sequelizeSystemObj } = require('../db/dbConf_system');
const { Sequelize, Op, QueryTypes } = require('sequelize');
const { ServiceModeName } = require('../conf/conf')

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

    const dateFrom = moment().startOf('month').format('YYYY-MM-DD')
    const dateTo = moment().endOf('month').format('YYYY-MM-DD')
    const today = moment().format('YYYY-MM-DD')

    let records = []
    cvVehicleList.forEach(row => {
        let { serviceModeId, typeOfVehicle, status, isInvalid, startDate, endDate, extensionDate } = row

        let vehicleStatus = 'A'
        let date = extensionDate ? extensionDate : endDate

        let availabilityDateFrom = dateFrom
        let availabilityDateTo = moment().endOf('month').format('YYYY-MM-DD')
        let unavailableReason = ""


        if (status != "Approved" || isInvalid || moment(today).isBefore(moment(startDate))) {
            vehicleStatus = 'D'
        }
        else if (moment(today).isAfter(moment(date))) {
            vehicleStatus = 'U'
            unavailableReason = "Contract Expiry"
        }

        if (vehicleStatus != 'D' && moment(today).format('YYYY-MM') == moment(date).format('YYYY-MM')) {
            availabilityDateTo = date
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
                        dateFrom: availabilityDateFrom,
                        dateTo: availabilityDateTo,
                        unavailableReason: unavailableReason
                    }
                    records.push(record)
                }
            }
        }
    })

    mvVehicleList.forEach(row => {
        let { vehicleName, category, status, baseLineQty, serviceMode } = row
        let vehicleStatus = 'A'
        let unavailableReason = ""
        let baseline = baseLineQty || 0

        if (status == "disable") {
            vehicleStatus = "U"
            baseline = 0
            unavailableReason = `Vehicle Type has been deactivated`
        } else if (!baseline) {
            unavailableReason = `Vehicle's baseline has been used up`
        }

        if (serviceMode) {
            let serviceModeList = serviceMode.split(',')
            for (let serviceMode of serviceModeList) {
                let obj = vehicleSubGroupList.find(o => o.serviceMode.toUpperCase() == serviceMode.toUpperCase()
                    && o.serviceType.toUpperCase() == category.toUpperCase() && o.category.toUpperCase() == 'MV')
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
                            baseLineQty: baseline,
                            dateFrom: dateFrom,
                            dateTo: dateTo,
                            unavailableReason: unavailableReason
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
            let allNGTSVehicle = await NGTSVehicle.findAll()
            let notForATMSVehicleIdList = allNGTSVehicle.filter(item => {
                return !records.some(o => o.resourceType == item.resourceType && o.group == item.group && Number(o.serviceTypeId) == Number(item.serviceTypeId) && Number(o.serviceModeId) == Number(item.serviceModeId))
            }).map(o => o.id)

            if (notForATMSVehicleIdList.length) {
                await NGTSVehicle.update({
                    status: 'U',
                    baseLineQty: 0,
                    unavailableReason: 'Vehicle Type is no longer belong to ATMS'
                }, {
                    where: {
                        id: {
                            [Op.in]: notForATMSVehicleIdList
                        }
                    },
                    transaction: t
                })
            }

            for (let row of records) {
                let { resourceType, group, serviceTypeId, serviceType, serviceModeId, serviceMode, serviceModeValue, status, baseLineQty, dateFrom, dateTo, unavailableReason } = row

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
                        dateFrom: dateFrom,
                        dateTo: dateTo,
                        unavailableReason: unavailableReason,
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
            await NGTSVehicle.update({
                status: 'D'
            }, {
                where: {
                    serviceMode: {
                        [Op.in]: ServiceModeName
                    }
                },
                transaction: t
            })
            await t.commit();
        } catch (error) {
            log.error(error)
            await t.rollback();
        }
    }
}
module.exports.saveVehicle = saveVehicle

// saveVehicle()