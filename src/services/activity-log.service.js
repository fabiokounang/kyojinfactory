const { getDb } = require("../database/sqlite");
const { parsePage, parsePageSize, computePaginationMeta } = require("../lib/pagination");
const {
  formatActivityTimeJakarta,
  describeActivityAction,
} = require("../lib/activity-log-display");

function getRequestIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return String(forwarded).split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "";
}

function toJsonText(value) {
  if (value === undefined) return null;
  return JSON.stringify(value);
}

async function createActivityLog({
  req,
  user,
  action,
  menuKey,
  entityType,
  entityId,
  status,
  note,
  beforeData,
  afterData,
  submittedData,
  deletedData,
}) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO activity_logs (
      user_id, username, role, ip_address, action, menu_key, entity_type, entity_id,
      status, note, before_data, after_data, submitted_data, deleted_data, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    user?.id || null,
    user?.username || "guest",
    user?.role || "guest",
    getRequestIp(req),
    action || "",
    menuKey || "",
    entityType || "",
    entityId ? String(entityId) : "",
    status || "success",
    note || "",
    toJsonText(beforeData),
    toJsonText(afterData),
    toJsonText(submittedData),
    toJsonText(deletedData),
    now
  );
}

function buildActivityLogConditions(filters = {}) {
  const where = [];
  const params = [];

  if (filters.username && String(filters.username).trim()) {
    where.push("lower(username) LIKE ?");
    params.push(`%${String(filters.username).toLowerCase()}%`);
  }

  if (filters.action && String(filters.action).trim()) {
    where.push("lower(action) LIKE ?");
    params.push(`%${String(filters.action).toLowerCase()}%`);
  }

  if (filters.menuKey && String(filters.menuKey).trim()) {
    where.push("menu_key = ?");
    params.push(String(filters.menuKey).trim());
  }

  if (filters.status && String(filters.status).trim()) {
    where.push("lower(status) = ?");
    params.push(String(filters.status).toLowerCase());
  }

  if (filters.ip && String(filters.ip).trim()) {
    where.push("ip_address LIKE ?");
    params.push(`%${String(filters.ip).trim()}%`);
  }

  if (filters.role && String(filters.role).trim()) {
    where.push("lower(role) LIKE ?");
    params.push(`%${String(filters.role).toLowerCase()}%`);
  }

  return { where, params };
}

function mapActivityRow(row) {
  const actionDisplay = describeActivityAction(row.action);
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    ipAddress: row.ip_address,
    action: row.action,
    actionDisplay,
    menuKey: row.menu_key,
    entityType: row.entity_type,
    entityId: row.entity_id,
    status: row.status,
    note: row.note,
    beforeData: parseJson(row.before_data),
    afterData: parseJson(row.after_data),
    submittedData: parseJson(row.submitted_data),
    deletedData: parseJson(row.deleted_data),
    createdAt: row.created_at,
    createdAtFormatted: formatActivityTimeJakarta(row.created_at),
  };
}

async function listActivityLogs({ username, action, limit = 200 }) {
  const result = await listActivityLogsPaged({
    username,
    action,
    page: 1,
    pageSize: limit,
  });
  return result.logs;
}

async function listActivityLogsPaged(filters = {}) {
  const db = await getDb();
  const { where, params } = buildActivityLogConditions(filters);
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countRow = await db.get(
    `SELECT COUNT(*) AS total FROM activity_logs ${whereSql}`,
    ...params
  );
  const total = Number(countRow?.total || 0);

  const ps = parsePageSize(filters.pageSize);
  const meta = computePaginationMeta(total, parsePage(filters.page), ps);

  const rows = await db.all(
    `SELECT *
     FROM activity_logs
     ${whereSql}
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    ...params,
    meta.pageSize,
    meta.offset
  );

  return {
    logs: rows.map(mapActivityRow),
    total: meta.total,
    page: meta.page,
    pageSize: meta.pageSize,
    totalPages: meta.totalPages,
    from: meta.from,
    to: meta.to,
  };
}

function parseJson(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (_err) {
    return null;
  }
}

module.exports = {
  createActivityLog,
  listActivityLogs,
  listActivityLogsPaged,
};
