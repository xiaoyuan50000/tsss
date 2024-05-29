let express = require('express');
require('express-async-errors');
const multer = require('multer');
const path = require('path');
const moment = require('moment');
const conf = require('../conf/conf');
const reqAck = require('../childProcess/reqAck.js')

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
    }
});

const upload = multer({ storage: storage });

router.post('/upload/indent', upload.single('file'), async function (req, res, next) {
    const file = req.file;
    let filedata = await reqAck.readCSVFileData(file.path)
    let result = await reqAck.processReqAckFileDatas([filedata])
    if (result.length) {
        return res.json({
            code: 0,
            msg: `There are ${result.length} incorrect data`,
            data: null
        })
    }
    return res.json({
        code: 1,
        msg: 'Success',
        data: null
    });
});

module.exports = router;