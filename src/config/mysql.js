const mysql = require("mysql2/promise");
const { nodeEnv, databaseUrl } = require("./env");

let mysqlPool = null;

function isMysqlEnabled() {
  if (process.env.DB_CLIENT) {
    return process.env.DB_CLIENT === "mysql";
  }

  const url = databaseUrl || process.env.MYSQL_URL || "";
  if (url) {
    return url.startsWith("mysql://") || url.startsWith("mysql2://");
  }

  return Boolean(process.env.MYSQL_HOST);
}

function getMysqlPool() {
  if (mysqlPool) {
    return mysqlPool;
  }

  const mysqlUrl = databaseUrl || process.env.MYSQL_URL || "";
  const useSsl =
    process.env.MYSQL_SSL === "true" ||
    nodeEnv === "production";

  mysqlPool = mysqlUrl
    ? mysql.createPool({
        uri: mysqlUrl,
        waitForConnections: true,
        connectionLimit: 10,
        multipleStatements: true,
        ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      })
    : mysql.createPool({
        host: process.env.MYSQL_HOST || "127.0.0.1",
        port: Number(process.env.MYSQL_PORT || 3306),
        user: process.env.MYSQL_USER || "root",
        password: process.env.MYSQL_PASSWORD || "",
        database: process.env.MYSQL_DATABASE || "kyojinfactory",
        waitForConnections: true,
        connectionLimit: 10,
        multipleStatements: true,
        ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      });

  return mysqlPool;
}

module.exports = {
  isMysqlEnabled,
  getMysqlPool,
};
