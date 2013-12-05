var async = require("async");

module.exports = function () {

    return function (req) {
        var _this = this;
        var n = req.content;

        if (n <= 2) {
            setImmediate(req.reply, null, 1);
        }
        else {
            async.series([
                function (callback) {
                    setTimeout(function () {
                        _this.send('fibonacci', n - 2, 300000, function (from, req) {
                            setImmediate(callback, null, req.content);
                        });
                    }, 0);
                },
                function (callback) {
                    setTimeout(function () {
                        _this.send('fibonacci', n - 1, 300000, function (from, req) {
                            setImmediate(callback, null, req.content);
                        });
                    }, 0);
                }
            ], function (err, result) {
                var f = result[0] + result[1];
                setImmediate(req.reply, null, f);
                console.log('ƒ ' + n + ' = ' + f);
            });
        }
    }

};