const log = require('../log/winston').logger('DB Helper');
const conf = require('../conf/conf.js');

const { Sequelize } = require('sequelize');

module.exports.sequelizeServerObj = new Sequelize(conf.dbServerConf.database, conf.dbServerConf.user, conf.dbServerConf.password, {
    host: conf.dbServerConf.host,
    port: conf.dbServerConf.port,
    dialect: 'mysql',
    logging: msg => {
        log.info(msg)
    },
    define: {
        freezeTableName: true
    },
    pool: {
        max: conf.dbServerConf.connectionLimit,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    dialectOptions: {
        charset: 'utf8mb4',
        connectTimeout: 100,
    },
    timezone: '+08:00'
});
