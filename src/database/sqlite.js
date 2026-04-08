const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
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

  if (isMysql()) {
    const pool = getMysqlPool();
    dbInstance = createMysqlCompatDb(pool);
    return dbInstance;
  }

  const storageDir = path.join(process.cwd(), "storage");
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  dbInstance = await open({
    filename: path.join(storageDir, "app.db"),
    driver: sqlite3.Database,
  });

  return dbInstance;
}

async function initDb() {
  const db = await getDb();
  const schemaPath = path.join(
    __dirname,
    isMysql() ? "schema.mysql.sql" : "schema.sql"
  );
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  await db.exec(schemaSql);

  const now = new Date().toISOString();
  const replacements = {
    "{{NOW_ISO}}": now,
    "{{SUPERADMIN_HASH}}": bcrypt.hashSync("master", 10),
    "{{ADMIN_HASH}}": bcrypt.hashSync("admin123", 10),
  };

  const seedPath = path.join(
    __dirname,
    isMysql() ? "seed.mysql.sql" : "seed.sql"
  );
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
