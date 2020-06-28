const nodemailer = require("nodemailer");
const express = require("express");
const bodyParser = require("body-parser");
const { validationResult } = require("express-validator");
const cors = require("cors");
const helmet = require("helmet");
const validationRules = require("./validate");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3001;

const corsOptions = ['http://localhost:3789', 'http://localhost:3789/contact'];
app.use(cors(corsOptions));

app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  // Specify directives as normal.
  directives: {
    defaultSrc: ["'self'", 'devmunns.site'],
    scriptSrc: ["'self'", "'none'"],
    styleSrc: ["'none'"],
    fontSrc: ["'none'"],
    imgSrc: ["'none'"],
    sandbox: ['allow-forms', 'allow-scripts'],
    reportUri: '/report-violation',
    objectSrc: ["'none'"],
    upgradeInsecureRequests: true,
    workerSrc: false  // This is not set.
  }
}));

app.use(bodyParser.urlencoded({ limit: "52428800", extended: true }));
app.use(bodyParser.json({ limit: "52428800" }));

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.post("/send/", validationRules(), (req, res) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const extracted = [];
    result.array().map((err) => {
      extracted.push({ [err.param]: err.msg })
      console.error(`${err.value},`);
    })
    console.error(extracted);
    return res.status(400).json({ errors: extracted });
  }
  else {
    const mailOptions = {
      from: req.body.name,
      to: "trevsites@gmail.com",
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
      type: "oauth2",
      user: "trevsites@gmail.com",
      clientId: process.env.CLIENT,
      clientSecret: process.env.SECRET,
      refreshToken: process.env.REF_TO,
    };

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: auth,
    });
    transporter.sendMail(mailOptions, (err, res) => {
      if (err) {
        console.log(err);
        return res.status(404).end();
      }
    });

    return res
      .status(200)
      .send({ auth: true, message: "MESSAGE RECEIVED!", name: req.body.name });
  }
});


app.post('/report-violation', (req, res) => {
  if (req.body) {
    console.log('CSP Violation: ', req.body)
  } else {
    console.log('CSP Violation: No data received!')
  }

  res.status(204).end()
})

app.all("*", (err, req, res) => {
  if (err) {
    console.log(`Final catch route => ${err}`);
    return res.status(500).end();
  }
})
// start the server
console.log(`Listening on port ${port}`);
const server = app.listen(port);

process.on('SIGINT', () => {
  console.log("Graceful Shutdown");
  server.close((err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }

    console.log("Success");
    process.exit(0);
  })
})

process.on('unhandledRejection', err => {
  console.error(`${err.status} - ${err.message} unhandled rejection!`);
  server.close((err) => {
    console.info("Closing connections..");
    if (err) {
      console.error(err);
      process.exit(1);
    }
  })
  console.error(`unhandled rejection! ${err.message} shutting down`);

  process.exit(1);
})