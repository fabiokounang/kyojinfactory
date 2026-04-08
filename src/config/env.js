const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET || "change-me",
  sessionSecret: process.env.SESSION_SECRET || "session-secret",
  databaseUrl: process.env.DATABASE_URL || "",
  dbClient: process.env.DB_CLIENT || "",
  mysqlHost: process.env.MYSQL_HOST || "",
  mysqlPort: Number(process.env.MYSQL_PORT || 3306),
  mysqlUser: process.env.MYSQL_USER || "",
  mysqlDatabase: process.env.MYSQL_DATABASE || "",
};
