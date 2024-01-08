var express = require('express');
var router = express.Router();
const jwtSecret = require('dotenv').config().parsed.JWT_SECRET


// const sqlite3 = require('sqlite3').verbose();
// const db = new sqlite3.Database('./db/texts.sqlite');
const db = require('../db/database.js');

// MongoDB
const mongo = require("mongodb").MongoClient;
// const dsn =  process.env.DBWEBB_DSN || "mongodb://127.0.0.1/mumin";
const dsn =  process.env.DBWEBB_DSN || "mongodb://127.0.0.1/chat";

router.get('/', function(req, res, next) {
    const data = {
        data: {
            msg: "Välkommen!"
        }
    };

    res.json(data);
});

function checkToken(req, res, next)  {
    const jwt = require('jsonwebtoken');

    const token = req.headers['x-access-token'];
    // console.log("checking token", token);

    jwt.verify(token, jwtSecret, function(err, decoded) {
        // console.log("hello, verifying");
        if (err) {
            // send error response
            console.log("error", err);
        }

        // Valid token send on the request
        console.log("valid");
        next();
    });
}

router.get('/logged-in',
    (req, res, next) => checkToken(req, res, next),
    function(req, res, next) {

    console.log("logged in");
    const data = {
        data: {
            dirTo: "/Logged-in",
            text: "Du har blivit inloggad"
        }
    };

    res.json(data);
});

async function getTradingInfo(req, res, next)  {
    trading = {};
    const user_id = req.headers['user_id'];

    let sql = `SELECT * FROM v_user WHERE user_id = ?`;
    await db.all(sql, user_id, (err, rows) => {
        var count = 0;
        rows.forEach(function (row) {
            // console.log("ros", row);
            trading[count] = row

            count++
        });

        next();
    });
}

router.get('/trade',
    (req, res, next) => checkToken(req, res, next),
    (req, res, next) => getTradingInfo(req, res, next),
    function(req, res, next) {

    console.log("trading", trading);

    const data = {
        data: trading
    };

    res.json(data);
});


async function getAllObjects(req, res, next)  {
    trading = {};

    let sql = `SELECT * FROM objects`;
    await db.all(sql, (err, rows) => {
        console.log("rows", rows);
        var count = 0;
        rows.forEach(function (row) {
            console.log("ros", row);
            trading[count] = row

            count++
        });

        next();
    });
}

router.get('/trade/showAll',
    (req, res, next) => checkToken(req, res, next),
    (req, res, next) => getAllObjects(req, res, next),
    function(req, res, next) {

    console.log("trading", trading);

    const data = {
        data: trading
    };

    res.json(data);
});


async function getOneObject(req, res, next)  {
    trading = {};
    const object = req.params['obj'];

    let sql = `SELECT * FROM objects WHERE object = ?`;
    await db.get(sql, object, (err, rows) => {
        console.log("row", rows);
        trading["object"] = rows.object
        trading["amount"] = rows.amount
        trading["current_price"] = rows.current_price.toFixed(2)

        next();
    });
}

async function getPrices(req, res, next)  {
    prices = {};
    const object = req.params['obj'];

    let sql = `SELECT label, price FROM prices WHERE object = ?`;
    await db.all(sql, object, (err, rows) => {
        console.log("prices", rows);
        var count = 0;
        rows.forEach(function (row) {
            // console.log("pros", row);
            prices[count] = row

            count++
        });

        next();
    });
}

router.get('/trade/showOne/:obj',
    (req, res, next) => checkToken(req, res, next),
    (req, res, next) => getOneObject(req, res, next),
    (req, res, next) => getPrices(req, res, next),
    function(req, res, next) {

    console.log("trading", trading);

    const data = {
        data: trading,
        prices: prices
    };

    res.json(data);
});


async function getOneUserObject(req, res, next)  {
    trading = {};
    const user_id = req.headers['user_id'];
    const object = req.params.obj;
    // console.log("user", user_id);
    // console.log("obj", object);

    let sql = `SELECT * FROM v_user_object WHERE user_id = ? AND object = ?`;
    await db.get(sql, user_id, object, (err, rows) => {
        // console.log("row", rows);
        if (rows) {
            trading["cash"] = rows.cash
            trading["object"] = rows.object
            trading["amount"] = rows.amount
            trading["bought_amount"] = rows.bought_amount
            trading["current_price"] = rows.current_price.toFixed(2)

            next();
        }
    });

    sql = `SELECT * FROM users, objects WHERE user_id = ? AND object = ?`;
    await db.get(sql, user_id, object, (err, rows) => {
        // console.log("row", rows);
        if (rows) {
            trading["cash"] = rows.cash  // users.cash
            trading["object"] = object
            trading["amount"] = rows.amount  // objects.amount
            trading["bought_amount"] = 0
            trading["current_price"] = rows.current_price.toFixed(2) //objects.current_price

        }

        next();
    });
}


router.get('/trade/buy/:obj',
    (req, res, next) => checkToken(req, res, next),
    (req, res, next) => getOneUserObject(req, res, next),
    function(req, res, next) {
    // console.log("trading obj");
    trading["title"] = "Köp";

    const data = {
        data: trading
    };

    res.json(data);
});


function checkBuy(req, res, next)  {
    var buy_amount = req.body.buy_amount;
    var object_amount = req.body.object_amount;
    var price = req.body.price;
    var cash = req.body.cash;

    console.log("check", req.body);

    if (buy_amount > object_amount) {
        const data = {
            message: "Antalet överstiger tillgängliga aktier."
        };

        res.json(data);
    } else if ((price * buy_amount) > cash) {
        const data = {
            message: "Otillräckliga tillgångar på kontot."
        };

        res.json(data);
    } else {
        next();
    }
}

async function checkRows(req, res, next)  {
    const user_id = req.body.user_id;
    const object = req.params.obj;

    answer = "";

    let sql = `SELECT COUNT(object) AS 'row' FROM bought WHERE user_id = ? AND object = ?`;
    await db.get(sql, user_id, object, (err, rows) => {
        console.log("row", rows);
        answer = rows.row

        next();
    });
}

router.post('/trade/buy/:obj',
    (req, res, next) => checkToken(req, res, next),
    (req, res, next) => checkBuy(req, res, next),
    (req, res, next) => checkRows(req, res, next),
    function(req, res, next) {
        var buy_amount = req.body.buy_amount;
        var user_id = req.body.user_id;
        var price = req.body.price;
        var total_price = price * buy_amount;
        var object = req.params.obj;

        if (answer > 0) {
            // Update users amount and purchase_price
            let sql = `UPDATE bought SET amount = amount + ?,
            purchase_price = ROUND(((purchase_price * amount) + ?) / (amount + ?), 2)
            WHERE user_id = ? AND object = ?`;

            db.run(sql,
                buy_amount,
                total_price,
                buy_amount,
                user_id,
                object, (err) => {
                    if (err) {
                        // returnera error
                        console.log("error", err);
                    }
                });
        } else {
            // insert
            let sql = `INSERT INTO bought
            VALUES (?, ?, ?, ?)`;

            db.run(sql,
                user_id,
                object,
                buy_amount,
                price, (err) => {
                    if (err) {
                        // returnera error
                        console.log("error", err);
                    }
                });
        }

        // Update amount and current_price
        let sql = `UPDATE objects SET amount = amount - ?,
        current_price = ?
        WHERE object = ?`;

        db.run(sql,
            buy_amount,
            price,
            object, (err) => {
                if (err) {
                    // returnera error
                    console.log("error", err);
                }
            });

        // Update users cash
        sql = `UPDATE users SET cash = ROUND(cash - ?, 2)
        WHERE user_id = ?`;

        db.run(sql,
            total_price,
            user_id, (err) => {
                if (err) {
                    // returnera error
                    console.log("error", err);
                }
            });

        const d = new Date();
        var theTime = d.toLocaleString();
        var label = theTime.slice(0, 16);

        // Update previous prices
        sql = `INSERT INTO prices
        VALUES (?, ?, ?)`;

        db.run(sql,
            object,
            label,
            price, (err) => {
                if (err) {
                    // returnera error
                    console.log("error", err);
                }
            });

        console.log("ans", answer);

        const data = {
            message: null,
            data: answer,
            price: price,
            label: label
        };

        res.json(data);
});


router.get('/trade/sell/:obj',
    (req, res, next) => checkToken(req, res, next),
    (req, res, next) => getOneUserObject(req, res, next),
    function(req, res, next) {
    console.log("trading obj");
    trading["title"] = "Sälj";

    const data = {
        data: trading
    };

    res.json(data);
});


function checkSell(req, res, next)  {
    var sell_amount = req.body.sell_amount;
    // antal som personen tidigare köpt
    var bought_amount = req.body.bought_amount;
    var price = req.body.price;
    var cash = req.body.cash;

    if (sell_amount > bought_amount) {
        const data = {
            message: "Antalet överstiger tillgängliga aktier."
        };

        res.json(data);
    }

    next();
}

router.post('/trade/sell/:obj',
    (req, res, next) => checkToken(req, res, next),
    (req, res, next) => checkSell(req, res, next),
    function(req, res, next) {
        var sell_amount = req.body.sell_amount;
        // antal som personen tidigare köpt
        var bought_amount = req.body.bought_amount;
        var user_id = req.body.user_id;
        var price = req.body.price;
        var total_price = (price * sell_amount).toFixed(2);
        var object = req.params.obj;

        if (sell_amount == bought_amount) {
            // Delete object from bought
            let sql = `DELETE FROM bought
            WHERE user_id = ? AND object = ?`;

            db.run(sql,
                user_id,
                object, (err) => {
                    if (err) {
                        // returnera error
                        console.log("error", err);
                    }
                });
        } else {
            // Update users amount
            let sql = `UPDATE bought SET amount = amount - ?
            WHERE user_id = ? AND object = ?`;

            db.run(sql,
                sell_amount,
                user_id,
                object, (err) => {
                    if (err) {
                        // returnera error
                        console.log("error", err);
                    }
                });
        }

        // Update amount and current_price
        let sql = `UPDATE objects SET amount = amount + ?,
        current_price = ?
        WHERE object = ?`;

        db.run(sql,
            sell_amount,
            price,
            object, (err) => {
                if (err) {
                    // returnera error
                    console.log("error", err);
                }
            });

        // Update users cash
        sql = `UPDATE users SET cash = ROUND(cash + ?, 2)
        WHERE user_id = ?`;

        db.run(sql,
            total_price,
            user_id, (err) => {
                if (err) {
                    // returnera error
                    console.log("error", err);
                }
            });

        const d = new Date();
        var theTime = d.toLocaleString();
        var label = theTime.slice(0, 16);

        // Update previous prices
        sql = `INSERT INTO prices
        VALUES (?, ?, ?)`;

        db.run(sql,
            object,
            label,
            price, (err) => {
                if (err) {
                    // returnera error
                    console.log("error", err);
                }
            });

        const data = {
            message: null,
            price: price,
            label: label
        };

        res.json(data);
});


router.post('/add-money/:id',
    (req, res, next) => checkToken(req, res, next),
    (req, res) => {
        ("req", req.body.money);

        let sql = `UPDATE users SET cash = cash + ? WHERE user_id = ?`;

        db.run(sql,
            req.body.money,
            req.params.id, (err) => {
                if (err) {
                    // returnera error
                    console.log("error", err);
                }
            });

        res.json({
            data: {
                id: req.params.id
            }
        });
});


// Save chat messages to MongoDB
router.post("/chat/save", async (req, res) => {
    let doc = req.body.msg;

    await saveInCollection(dsn, "messages", {doc});

    res.status(201).json({
        data: {
            msg: "Got a POST request, sending back 201 Created"
        }
    });
});

/**
 * Save documents in a collection.
 *
 * @async
 *
 * @param {string} dsn        DSN to connect to database.
 * @param {string} colName    Name of collection.
 * @param {object} docs       Documents to be saved.
 *
 * @throws Error when database operation fails.
 *
 * @return {Promise<array>} The resultset as an array.
 */
async function saveInCollection(dsn, colName, doc) {
    const client  = await mongo.connect(dsn);
    const db = await client.db();
    const col = await db.collection(colName);

    const result = await col.insertOne(doc);
    console.log(
       `A document was inserted with the _id: ${result.insertedId}`,
    );

    await client.close();
}

// Return a JSON object with list of all documents within the collection.
router.get("/list", async (req, res) => {
    try {
        let ans = await findInCollection(dsn, "messages", {}, {}, 0);

        console.log(ans);
        res.json(ans);
    } catch (err) {
        console.log(err);
        res.json(err);
    }
});

/**
 * Find documents in a collection by matching search criteria.
 *
 * @async
 *
 * @param {string} dsn        DSN to connect to database.
 * @param {string} colName    Name of collection.
 * @param {object} criteria   Search criteria.
 * @param {object} projection What to project in results.
 * @param {number} limit      Limit the number of documents to retrieve.
 *
 * @throws Error when database operation fails.
 *
 * @return {Promise<array>} The resultset as an array.
 */
async function findInCollection(dsn, colName, criteria, projection, limit) {
    const client  = await mongo.connect(dsn);
    const db = await client.db();
    const col = await db.collection(colName);
    const res = await col.find(criteria, projection).limit(limit).toArray();

    await client.close();

    return res;
}

module.exports = router;
