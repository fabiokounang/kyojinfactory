const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const { Pool } = require("pg");

let dbInstance = null;

function isPostgres() {
  return Boolean(process.env.DATABASE_URL);
}

function withPgPlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
}

function createPgCompatDb(pool) {
  return {
    driver: "postgres",
    async exec(sql) {
      await pool.query(sql);
    },
    async all(sql, ...params) {
      const result = await pool.query(withPgPlaceholders(sql), params);
      return result.rows;
    },
    async get(sql, ...params) {
      const result = await pool.query(withPgPlaceholders(sql), params);
      return result.rows[0];
    },
    async run(sql, ...params) {
      const isInsert = /^\s*insert\s+/i.test(sql);
      const hasReturning = /\sreturning\s+/i.test(sql);
      let finalSql = sql;
      if (isInsert && !hasReturning) {
        finalSql = `${sql} RETURNING id`;
      }
      const result = await pool.query(withPgPlaceholders(finalSql), params);
      return {
        changes: result.rowCount || 0,
        lastID: isInsert ? (result.rows[0] ? result.rows[0].id : null) : null,
      };
    },
  };
}

async function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  if (isPostgres()) {
    const useSsl =
      process.env.PGSSL === "true" ||
      process.env.NODE_ENV === "production";
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    });
    dbInstance = createPgCompatDb(pool);
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
    isPostgres() ? "schema.pg.sql" : "schema.sql"
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
    isPostgres() ? "seed.pg.sql" : "seed.sql"
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
