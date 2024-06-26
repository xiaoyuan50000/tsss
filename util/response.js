/**
 * @param data:  response data
 * @param res:  response
 */
module.exports.success = function (res, data = null) {
    let success = {
        "code": 1,
        "msg": 'success',
        "data": data
    };

    return res.json(success);
}

module.exports.error = function (res, msg, code = null) {
    return res.json({
        "code": code || 0,
        "msg": msg,
        "data": ""
    });
}