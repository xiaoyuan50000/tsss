let express = require('express');
const log = require('./log/winston').logger('APP');
const helmet = require('helmet');
const indexRouter = require('./routes/index');
const csrf = require('csurf');


let app = express();

const csrfProtection = csrf({ cookie: { secure: true, httpOnly: true } });

app.use(express.json({ limit: '16mb' }));
app.use(express.urlencoded({ extended: false }));

app.use('/', indexRouter);

app.use(function (req, res, next) {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
});

app.use(function (err, req, res, next) {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    log.error(`URL(${req.originalUrl}) `, JSON.stringify(err));
    res.json('Server error!');
});

app.use(helmet({
	contentSecurityPolicy: {
		useDefaults: false,
		directives: {
			"default-src": ["'self'"],
			"script-src": ["'self' 'unsafe-inline' blob:"],
			"script-src-attr": ["'self' 'unsafe-inline'"],
			"style-src": ["'self' 'unsafe-inline'"],
			"connect-src": ["'self'"],
			"img-src": ["'self' data:"],
			"form-action": ["'self'"],
			"frame-ancestors": ["'self'"],
		},
	},
}));

require('./util/initFolder')

let utils = require('./util/sftpUtil')
utils.TestConnectSFTPServer().then(r => {
})
const locationSchedule = require('./schedule/locationSchedule');
locationSchedule.locationScheduleStart()

const vehicleSchedule = require('./schedule/vehicleSchedule');
vehicleSchedule.vehicleScheduleStart()

const reqAckSchedule = require('./schedule/reqAckSchedule');
reqAckSchedule.reqACKScheduleStart()

const saveVehicleSchedule = require('./schedule/saveVehicleSchedule');
saveVehicleSchedule.saveVehicleScheduleStart()

const qncSchedule = require('./schedule/qncSchedule');
qncSchedule.qncScheduleStart()


process.on('uncaughtException', function (e) {
    log.error(`uncaughtException`)
    log.error(e)
});
process.on('unhandledRejection', function (err, promise) {
    log.error(`unhandledRejection`);
    log.error(err);
})

module.exports = app;
