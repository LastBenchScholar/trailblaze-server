const debug = require("debug")("trailblaze:middleware");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const cors = require("cors");
require("dotenv").config();

const initMiddleware = (app) => {
  debug("Initializing middlewares...");

  // Helmet for setting Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: ["'self'", ...process.env.ALLOWED_ORIGINS.split(",")],
          scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
        },
      },
    }),
  );

  // CORS Configuration
  app.use(
    cors({
      origin:
        process.env.NODE_ENV === "production" ? [...process.env.ALLOWED_ORIGINS.split(",")] : "*",
      credentials: true,
    }),
  );

  // Logging using morgan
  app.use(morgan("dev"));

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(cookieParser());

  debug("Finished initializing middlewares...");
};

module.exports = initMiddleware;
