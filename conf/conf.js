module.exports.dbServerConf = {
    host: '192.168.1.3',
    user: 'root',
    password: 'root',
    port: 3306,
    database: 'mobius-driver',
    connectionLimit: 500
};

module.exports.dbSystemConf = {
    host: 'localhost',
    user: 'root',
    password: 'root',
    port: 3306,
    database: 'tms3',
    timezone: 'GMT%2B8',
    multipleStatements: true,
    connectionLimit: 500
};

module.exports.port = 5022

module.exports.client_id = '07c5b4b3c04e43'

module.exports.client_secret = '12ba92cb80fd6c42'

module.exports.create_job_url = ''

module.exports.cancel_job_url = ''

module.exports.request_3rd_part = false

// firebase url
module.exports.firebase_notification_url = 'http://localhost:10000/publicFirebaseNotification'

module.exports.CreateJobJsonField = {
    UserNameField: 2502,
    ContactNumberField: 2549,
    ResourceField: 2503,
    ServiceModeField: 2504,
    TrackingIdField: 2505,
    ActivityNameField: 2510,
    StartTimeField: 2511,
    EndTimeField: 2512,
    PoNumberField: 2571,
    GroupIdField: 511,
}

module.exports.mobius_server_url = 'http://192.168.1.18:5000'

module.exports.auto_assign = false 

module.exports.scheduleCron = {
    SAVE_VEHICLE: ['0 0 2 * * *'],
    NGTS_VEHICLE: ['0 0 15 * * *'],
    NGTS_VEHICLE_AVAIL: ['0 0 15 * * *'],
    NGTS_QNC: ['0 0 15 * * *'],
    NGTS_LOCATION: ['0 08 18 * * *'],
    NGTS_REQ_ACK: ['0 0 3 * * *', '0 0 7 * * *', '0 0 11 * * *', '0 0 15 * * *', '0 0 19 * * *', '0 0 23 * * *'],
    NGTS_RESP: ['0 0 3 * * *', '0 0 7 * * *', '0 0 11 * * *', '0 0 15 * * *', '0 0 19 * * *', '0 0 23 * * *'],
}

module.exports.SFTPLocalDownloadPath = "F:/SFTP/Download"
module.exports.SFTPLocalUploadPath = "F:/SFTP/Upload"

module.exports.SFTPRemotePath = {
    in: '/in/',
    out: '/out/',
}

module.exports.SFTPConf = {
    host: '192.168.1.3',
    port: '22',
    username: 'ngts',
    password: '123456',
    readyTimeout: 10000,
    retries: 0,
};