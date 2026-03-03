const debug = require("debug")("trailblaze:database");
const mongoose = require("mongoose");

const initDatabase = async () => {
  debug("Initializing database connection...");

  /**
   * MongoDB Connection URI
   */
  let dbUri = process.env.MONGO_URL;

  /**
   * Start MongoDB Connection
   */
  try {
    mongoose.connect(dbUri, {});
    debug("Connected to database");
  } catch (err) {
    debug(`Connection error: ${err}`);
  }

  /**
   * Listeners on MongoDB Startup
   */
  const connection = mongoose.connection;
  connection.on("connected", () => {
    debug("Connected to database");
  });
  connection.on("error", (err) => {
    debug(`Database error: ${err}`);
  });
  connection.on("disconnected", () => {
    debug("Disconnected from database");
  });
  connection.on("reconnected", () => {
    debug("Reconnected to database");
  });
};

module.exports = initDatabase;
