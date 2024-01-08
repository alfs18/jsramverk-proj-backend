const express = require('express');
const cors = require('cors');
// const morgan = require('morgan');
const bodyParser = require("body-parser");
const jwtSecret = require('dotenv').config().parsed.JWT_SECRET;

const app = express();
const port = 1337;

const index = require('./routes/index');

// const sqlite3 = require('sqlite3').verbose();
// const db = new sqlite3.Database('./db/texts.sqlite');
const db = require('./db/database.js');

const bcrypt = require('bcryptjs');
const saltRounds = 10;
// const myPlaintextPassword = 'longandhardP4$$w0rD';

app.use(cors());

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// This is middleware called for all routes.
// Middleware takes three parameters.
app.use((req, res, next) => {
    console.log(req.method);
    console.log(req.path);
    next();
});

// Add routes
app.use('/', index);

// Create new user
app.post("/register", (req, res) => {
    // console.log(req.body);

    bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
        // spara användaren i databasen.
        db.run("INSERT INTO users (email, password, name, year, month, day) VALUES (?, ?, ?, ?, ?, ?)",
            req.body.email,
            hash,
            req.body.name,
            req.body.year,
            req.body.month,
            req.body.day, (err) => {
                if (err) {
                    // returnera error
                    console.log("error", err);
                }
                console.log("OK");
            });
    });

    res.status(201).json({
        data: {
            msg: "Got a POST request, sending back 201 Created"
        }
    });
});


app.post("/login", (req, res) => {
    // req.match = "yes";

    const myPlaintextPassword = req.body.password;

    let sql = `SELECT * FROM users WHERE email = ?`;
    let email = req.body.email;

    db.get(sql, [email], (err, row) => {
        if (err) {
            console.log("error");
            return console.error(err.message);
        } else if (row == undefined) {
            // Emailen finns ej i databasen
            console.log("No such email");

            const data = {
                msg: "Kunde inte logga in. Försök igen."
            };

            res.json(data);
        } else {
            const hash = row.password;
            const user_id = row.user_id;

            const jwt = require('jsonwebtoken');
            var end = res;

            bcrypt.compare(myPlaintextPassword, hash, function(err, res) {
                // res innehåller nu true eller false beroende på om det är rätt lösenord.
                if (err) {
                    // returnera error
                    console.log("Wrong password.");
                    end.redirect("/no");
                } else if (res == true) {
                    // lösenorden matchar
                    console.log("Correct");

                    const payload = { email: req.body.email };
                    const token = jwt.sign(payload, jwtSecret, { expiresIn: '1h'});

                    jwt.verify(token, jwtSecret, function(err, decoded) {
                        if (err) {
                            // not a valid token
                            console.log("Not a valid token");
                            end.redirect("/no");
                        }
                        // valid token
                        console.log("token exist");

                        var data = {
                            token: token,
                            user_id: user_id,
                            data: {
                                // dirTo: "/logged-in"
                                dirTo: "/trade"
                            },
                            type: "success"
                        };

                        end.json(data);
                    });
                } else {
                    // lösenorden matchar inte
                    console.log("Not a match", res);

                    const data = {
                        msg: "Kunde inte logga in. Försök igen."
                    };

                    end.json(data);
                }
            });
        }

        return row
            ? console.log(row.name)
            : console.log(`Email: ${email} is not found.`);
    });
});



app.post("/reports",
    (req, res, next) => checkToken(req, res, next),
    (req, res) => addReport(res, req.body));

function checkToken(req, res, next)  {
    const jwt = require('jsonwebtoken');

    const token = req.headers['x-access-token'];



    jwt.verify(token, jwtSecret, function(err, decoded) {
        console.log("trying to verify");
        if (err) {
            // send error response
            console.log("error", err);
        }

        // Valid token send on the request
        console.log("valid");
        next();
    });
    next();
}

function addReport(res, req) {
    console.log("report req", req);

    // spara användaren i databasen.
    db.run("INSERT INTO reports (title, report) VALUES (?, ?)",
        req.title,
        req.text, (err) => {
            if (err) {
                // returnera error
                console.log("error", err);
            }
            console.log("OK");
        });

    return res.status(201).json({
        data: {
            msg: "Report Created",
            dirTo: "/reports/create"
        }
    });
}

app.post("/reports/edit",
    (req, res, next) => checkToken(req, res, next),
    (req, res) => {
        console.log("post edit");

        res.json({
            data: {
                id: req.body.id
            }
        });
    });

app.post("/reports/edit/:id",
    (req, res, next) => checkToken(req, res, next),
    (req, res) => {
        let sql = `UPDATE reports SET title = ?, report = ? WHERE id = ?`;

        db.run(sql,
            req.body.title,
            req.body.text,
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

// Start up server
// app.listen(port, () => console.log(`Example API listening on port ${port}!`));

const server = app.listen(port, () => console.log(`Example app listening on port ${port}!`));

module.exports = server;
