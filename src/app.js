'use strict';

const apiai = require('apiai');
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');

const SparkBot = require('./sparkbot');
const SparkBotConfig = require('./sparkbotconfig');

const REST_PORT = (process.env.PORT || 5000);
const DEV_CONFIG = process.env.DEVELOPMENT_CONFIG == 'true';

const APP_NAME = process.env.APP_NAME;
const APIAI_ACCESS_TOKEN = process.env.APIAI_ACCESS_TOKEN;
const APIAI_LANG = process.env.APIAI_LANG;
//const SPARK_TOKEN = process.env.SPARK_TOKEN;

const SPARK_CLIENT_ID = process.env.SPARK_CLIENT_ID;
const SPARK_CLIENT_SECRET = process.env.SPARK_CLIENT_SECRET;

var baseUrl = "";
if (APP_NAME) {
    // Heroku case
    baseUrl = `https://${APP_NAME}.herokuapp.com`;
} else {
    console.error('Set up the url of your service here and remove exit code!');
    process.exit(1);
}

// console timestamps
require('console-stamp')(console, 'yyyy.mm.dd HH:MM:ss.l');


function startBot(accessToken) {
    const botConfig = new SparkBotConfig(
        APIAI_ACCESS_TOKEN,
        APIAI_LANG,
        accessToken);

    botConfig.devConfig = DEV_CONFIG;

    const bot = new SparkBot(botConfig, baseUrl);
    // bot.start(() => {
    //         console.log("Bot started");
    //     },
    //     (errStatus) => {
    //         console.error("Can't create webhook:", errStatus);
    //     });
}

const app = express();
app.use(bodyParser.json());

app.post('/webhook', (req, res) => {
    console.log('POST webhook');

    try {
        bot.processMessage(req, res);
    } catch (err) {
        return res.status(400).send('Error while processing ' + err.message);
    }
});

app.get('/auth', (req, res) => {

    var code = req.query.code;

    request.post('https://api.ciscospark.com/v1/access_token', {
        form: {
            grant_type: 'authorization_code',
            code: code,
            client_id: SPARK_CLIENT_ID,
            client_secret: SPARK_CLIENT_SECRET,
            redirect_uri: baseUrl + '/success'
        }
    }, (err, authResp) => {
        // {
        //     "access_token":"ZDI3MGEyYzQtNmFlNS00NDNhLWFlNzAtZGVjNjE0MGU1OGZmZWNmZDEwN2ItYTU3",
        //     "expires_in":1209600, //seconds
        //     "refresh_token":"MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDEyMzQ1Njc4OTEyMzQ1Njc4",
        //     "refresh_token_expires_in":7776000 //seconds
        // }

        if (!err) {
            let accessToken = authResp.body.access_token;

            startBot(accessToken);
        } else {
            console.error("Can't auth:", err);
        }
    })
});

app.get('/success', (req,res) => {
    res.sendFile('html/success.html', { root: __dirname });
});

app.listen(REST_PORT, function () {
    console.log('Rest service ready on port ' + REST_PORT);
});