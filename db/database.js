var sqlite3 = require('sqlite3').verbose();

module.exports = (function () {
    if (process.env.NODE_ENV === 'test') {
        console.log("env", process.env.NODE_ENV);
        return new sqlite3.Database('./db/test_db.sqlite');
    }

    return new sqlite3.Database('./db/texts.sqlite');
}());
