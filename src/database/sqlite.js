const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { isMysqlEnabled, getMysqlPool } = require("../config/mysql");

let dbInstance = null;

function isMysql() {
  return isMysqlEnabled();
}

function createMysqlCompatDb(pool) {
  return {
    driver: "mysql",
    async exec(sql) {
      const conn = await pool.getConnection();
      try {
        await conn.query(sql);
      } finally {
        conn.release();
      }
    },
    async all(sql, ...params) {
      const [rows] = await pool.query(sql, params);
      return rows;
    },
    async get(sql, ...params) {
      const [rows] = await pool.query(sql, params);
      return rows[0];
    },
    async run(sql, ...params) {
      const [result] = await pool.query(sql, params);
      return {
        changes: result.affectedRows || 0,
        lastID: result.insertId || null,
      };
    },
  };
}

async function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  if (!isMysql()) {
    throw new Error(
      "MySQL is not configured. Set DB_CLIENT=mysql and MYSQL_* or DATABASE_URL."
    );
  }

  const pool = getMysqlPool();
  dbInstance = createMysqlCompatDb(pool);
  return dbInstance;
}

async function initDb() {
  const db = await getDb();
  const schemaPath = path.join(__dirname, "schema.mysql.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  await db.exec(schemaSql);

  const now = new Date().toISOString();
  const replacements = {
    "{{NOW_ISO}}": now,
    "{{SUPERADMIN_HASH}}": bcrypt.hashSync("master", 10),
    "{{ADMIN_HASH}}": bcrypt.hashSync("admin123", 10),
  };

  const seedPath = path.join(__dirname, "seed.mysql.sql");
  let seedSql = fs.readFileSync(seedPath, "utf8");
  for (const [key, value] of Object.entries(replacements)) {
    seedSql = seedSql.replaceAll(key, value);
  }
  await db.exec(seedSql);
}

module.exports = {
  getDb,
  initDb,
};
