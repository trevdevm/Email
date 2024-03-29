const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const express = require("express");
const bodyParser = require("body-parser");
const { validationResult } = require("express-validator");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const winston = require("./config/winston");
const validationRules = require("./validate");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3001;
const base = process.env.BASE_URL;
app.use(morgan('combined', { stream: winston.stream }));

const corsOptions = [process.env.ROUTE1, process.env.ROUTE2];
app.use(cors(corsOptions));

app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'", process.env.SHORT_BASE],
    scriptSrc: ["'self'", "'none'"],
    styleSrc: ["'none'"],
    fontSrc: ["'none'"],
    imgSrc: ["'none'"],
    sandbox: ['allow-forms', 'allow-scripts'],
    reportUri: '/report-violation',
    objectSrc: ["'none'"],
    upgradeInsecureRequests: true,
    workerSrc: false
  }
}));

app.use(bodyParser.urlencoded({ limit: "52428800", extended: true }));
app.use(bodyParser.json({ limit: "52428800" }));

app.use(function (req, res, next) {
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type",
    "Accept"
  );
  res.header("Content-Type", "application/json")
  res.header("Access-Control-Allow-Methods", "POST")
  next();
});

app.post("/send/", validationRules(), (req, res) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const extracted = [];
    result.array().map((err) => {
      extracted.push({ [err.param]: err.msg })
      winston.error(`${err.value},`);
    })
    winston.error(extracted);
    return res.status(400).send({ errors: extracted });
  }

  try {
    const oauth2Client = new OAuth2(
      process.env.CLIENT,
      process.env.SECRET,
      "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.REFRESH
    });

    const accessToken = oauth2Client.getAccessToken();

    const mailOptions = {
      from: req.body.name,
      to: process.env.DEV_EMAIL,
      subject: "My site contact from: " + req.body.name,
      text: req.body.message,
      html:
        "Message from: " +
        req.body.name +
        "<br></br> Email: " +
        req.body.email +
        "<br></br> Message: " +
        req.body.message,
    };

    const auth = {
      type: "OAuth2",
      user: process.env.DEV_EMAIL,
      clientId: process.env.CLIENT,
      clientSecret: process.env.SECRET,
      refreshToken: process.env.REFRESH,
      accessToken: accessToken
    };

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: auth,
    });

    transporter.sendMail(mailOptions, (err, res) => {
      if (err) {
        winston.error(err);
        return res.status(404).end();

      }

      transporter.close();
    });

    winston.info("Sucessful Email.");
    return res
      .status(200)
      .send({ auth: true, message: "MESSAGE RECEIVED!", name: req.body.name });
  } catch (err) {

    winston.error("Error sending email, this needs attention.");
    next(err);
  }
});


app.post('/report-violation', (req, res) => {
  if (req.body) {
    winston.info('CSP Violation: ', req.body);
  } else {
    winston.info('CSP Violation: No data received!');
  }

  res.status(204).end()
})

app.all("*", (err, req, res) => {
  if (err) {
    winston.error(`Final catch route err => ${err}`);
    return res.status(500).end();
  }
  winston.info(`Catch Route hit/request url: ${req.originalUrl}`);
  return res.status(404).render(`Couldn't find ${base}${req.originalUrl}`);
})

const server = app.listen(port);
winston.info(`Listening on port ${port}`);

process.on('SIGINT', () => {
  winston.info("Graceful Shutdown");
  server.close((err) => {
    if (err) {
      winston.error(err);
      process.exit(1);
    }

    winston.info("Success");
    process.exit(0);
  })
})

process.on('unhandledRejection', err => {
  winston.error(`${err.status} - ${err.message} unhandled rejection!`);
  server.close((err) => {
    winston.info("Closing connections..");
    if (err) {
      winston.error(err);
      process.exit(1);
    }
  })
  winston.error(`unhandled rejection! ${err.message} shutting down`);

  process.exit(1);
})