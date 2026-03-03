const debug = require("debug")("trailblaze:server");
const express = require("express");
const initMiddleware = require("./config/middleware");
const initDatabase = require("./config/database");
const initRoutes = require("./routes");
require("dotenv").config();

// express app
const app = express();

// Middlewares
initMiddleware(app);

// Database
initDatabase();

// Routes
initRoutes(app);

// Error Handling
app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({
    message: error.message || "Server Error: Something went wrong",
    status: error.status || 500,
    stack: process.env.NODE_ENV === "development" ? error.stack : "",
  });
});

app.listen(process.env.PORT || 4000, () => {
  debug(`Listening on port ${process.env.PORT || 4000}`);
});
