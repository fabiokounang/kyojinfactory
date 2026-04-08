const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET || "change-me",
  sessionSecret: process.env.SESSION_SECRET || "session-secret",
  databaseUrl: process.env.DATABASE_URL || "",
};
