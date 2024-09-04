let express = require('express');
require('express-async-errors');
const multer = require('multer');
const path = require('path');
const moment = require('moment');
const conf = require('../conf/conf');
const reqAckChildPress = require('../childProcess/reqAck.js')
const locationChildPress = require('../childProcess/location.js')
const qncChildPress = require('../childProcess/qnc.js')
const vehicleChildPress = require('../childProcess/vehicle.js')
const vehicleAvailChildPress = require('../childProcess/vehicleAvail.js')
const respChildPress = require('../childProcess/resp.js')
const saveVehicleChildPress = require('../childProcess/saveVehicle.js')
const utils = require('../util/utils');
const Response = require('../util/response.js');
const log = require('../log/winston').logger('Router Index');

let router = express.Router();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, conf.SFTPLocalDownloadPath);
    },
    filename: function (req, file, cb) {
        const originalname = file.originalname
        const ext = path.extname(originalname);
        const basename = path.basename(originalname, ext)
        const name = basename + '_UPLOAD_' + moment().format("YYYYMMDDHHmm") + ext
        cb(null, name);
    },
});

const upload = multer({ storage: storage });

router.post('/upload/indent', upload.single('file'), async function (req, res, next) {
    try {
        const file = req.file;
        const filePath = utils.getSafeFileName(file.path)
        let filedata = await reqAckChildPress.readCSVFileData(filePath)
        let result = await reqAckChildPress.processReqAckFileDatas([filedata])
        if (result.length) {
            let error = reqAckChildPress.handleErrorResponse(result)
            log.error([filePath, error])
            return Response.error(res, error)
        }
        return Response.success(res)
    } catch (ex) {
        log.error(ex)
        return Response.error(res, 'Upload Failed!')
    }
});

router.get('/api/:file/csv', async function (req, res, next) {
    try {
        let file = req.params.file

        let dateformat = moment().format('YYYYMMDDHHmm')
        let result = null
        switch (file) {
            case 'location':
                result = await locationChildPress.generateLocation(dateformat)
                break;
            case 'qnc':
                result = await qncChildPress.generateQNC(dateformat)
                break;
            case 'vehicle':
                result = await vehicleChildPress.generateVehicleFile(dateformat)
                break;
            case 'vehicleAvail':
                result = await vehicleAvailChildPress.generateVehicleAvailFile(dateformat)
                break;
            case 'reqAck':
                result = await reqAckChildPress.generateReqAck(dateformat)
                break;
            case 'resp':
                result = await respChildPress.generateRespFile(dateformat)
                break;
            default:
                result = { code: 100, filename: "" }
                break
        }

        let code = result.code

        if (code == 1) {
            return Response.success(res)
        } else if (code == 100) {
            return Response.error(res, `404 Cannot find this Api`)
        } else {
            return Response.error(res, `Api error`)
        }
    } catch (ex) {
        log.error(ex)
        return Response.error(res, `Api error`)
    }
})

router.get('/api/saveVehicle', async function (req, res, next) {
    try {
        await saveVehicleChildPress.saveVehicle()
        return Response.success(res)
    } catch (ex) {
        log.error(ex)
        return Response.error(res, `Api error`)
    }
})


module.exports = router;