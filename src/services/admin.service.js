const bcrypt = require("bcryptjs");
const { getDb } = require("../database/sqlite");
const { getUserPermissions, grantDefaultAdminPermissions } = require("./permission.service");
const { parsePage, parsePageSize, computePaginationMeta } = require("../lib/pagination");

function validateAdminUsername(username) {
  const u = String(username || "").trim();
  if (u.length < 2) {
    return { error: "Username minimal 2 karakter" };
  }
  if (u.length > 191) {
    return { error: "Username terlalu panjang" };
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(u)) {
    return { error: "Username hanya huruf, angka, titik, garis bawah, atau tanda hubung" };
  }
  return { username: u };
}

function buildAdminUserConditions({ q, roleFilter }) {
  const conditions = [];
  const params = [];

  if (roleFilter === "admin") {
    conditions.push("role = 'admin'");
  } else if (roleFilter === "superadmin") {
    conditions.push("role = 'superadmin'");
  } else {
    conditions.push("role IN ('admin', 'superadmin')");
  }

  if (q && String(q).trim()) {
    conditions.push("lower(username) LIKE ?");
    params.push(`%${String(q).toLowerCase()}%`);
  }

  return { conditions, params };
}

async function listAdminUsersPaged({ q, roleFilter, page, pageSize }) {
  const db = await getDb();
  const { conditions, params } = buildAdminUserConditions({ q, roleFilter });
  const whereSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRow = await db.get(
    `SELECT COUNT(*) AS total FROM users ${whereSql}`,
    ...params
  );
  const total = Number(countRow?.total || 0);

  const ps = parsePageSize(pageSize);
  let meta = computePaginationMeta(total, parsePage(page), ps);

  const users = await db.all(
    `SELECT id, username, role, created_at
     FROM users
     ${whereSql}
     ORDER BY role DESC, username ASC
     LIMIT ? OFFSET ?`,
    ...params,
    meta.pageSize,
    meta.offset
  );

  const result = [];
  for (const user of users) {
    const permissions = await getUserPermissions(user.id, user.role);
    result.push({
      id: user.id,
      username: user.username,
      role: user.role,
      createdAt: user.created_at,
      permissions,
    });
  }

  return {
    users: result,
    total: meta.total,
    page: meta.page,
    pageSize: meta.pageSize,
    totalPages: meta.totalPages,
    from: meta.from,
    to: meta.to,
  };
}

async function getUserById(userId) {
  const db = await getDb();
  return db.get(
    "SELECT id, username, role, created_at FROM users WHERE id = ?",
    userId
  );
}

async function createAdminUser({ username, password }) {
  const vu = validateAdminUsername(username);
  if (vu.error) {
    return { error: vu.error };
  }
  const pwd = String(password || "");
  if (pwd.length < 6) {
    return { error: "Password minimal 6 karakter" };
  }

  const db = await getDb();
  const exists = await db.get("SELECT id FROM users WHERE username = ?", vu.username);
  if (exists) {
    return { error: "Username sudah dipakai" };
  }

  const now = new Date().toISOString();
  const hash = bcrypt.hashSync(pwd, 10);
  const runResult = await db.run(
    "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, 'admin', ?)",
    vu.username,
    hash,
    now
  );
  const newId = runResult.lastID;
  await grantDefaultAdminPermissions(newId);
  return { data: { id: newId, username: vu.username, role: "admin" } };
}

async function updateAdminUser(id, { username, password }) {
  const vu = validateAdminUsername(username);
  if (vu.error) {
    return { error: vu.error };
  }
  const db = await getDb();
  const row = await db.get("SELECT id, username, role FROM users WHERE id = ?", id);
  if (!row || row.role !== "admin") {
    return { error: "User admin tidak ditemukan", status: 404 };
  }

  const dup = await db.get(
    "SELECT id FROM users WHERE username = ? AND id <> ?",
    vu.username,
    id
  );
  if (dup) {
    return { error: "Username sudah dipakai" };
  }

  const pwd = String(password || "").trim();
  if (pwd && pwd.length < 6) {
    return { error: "Password minimal 6 karakter" };
  }

  if (pwd) {
    const hash = bcrypt.hashSync(pwd, 10);
    await db.run(
      "UPDATE users SET username = ?, password_hash = ? WHERE id = ? AND role = 'admin'",
      vu.username,
      hash,
      id
    );
  } else {
    await db.run("UPDATE users SET username = ? WHERE id = ? AND role = 'admin'", vu.username, id);
  }

  return {
    data: {
      id,
      username: vu.username,
      beforeUsername: row.username,
      passwordChanged: Boolean(pwd),
    },
  };
}

async function updateSuperadminSelf(userId, { currentPassword, username, newPassword }) {
  const db = await getDb();
  const row = await db.get("SELECT id, username, role, password_hash FROM users WHERE id = ?", userId);
  if (!row || row.role !== "superadmin") {
    return { error: "Akun superadmin tidak ditemukan", status: 404 };
  }

  if (!String(currentPassword || "").trim()) {
    return { error: "Password saat ini wajib diisi" };
  }
  if (!bcrypt.compareSync(String(currentPassword), row.password_hash)) {
    return { error: "Password saat ini salah" };
  }

  const vu = validateAdminUsername(username);
  if (vu.error) {
    return { error: vu.error };
  }

  const dup = await db.get(
    "SELECT id FROM users WHERE username = ? AND id <> ?",
    vu.username,
    userId
  );
  if (dup) {
    return { error: "Username sudah dipakai" };
  }

  const pwd = String(newPassword || "").trim();
  if (pwd && pwd.length < 6) {
    return { error: "Password baru minimal 6 karakter" };
  }

  if (pwd) {
    const hash = bcrypt.hashSync(pwd, 10);
    await db.run(
      "UPDATE users SET username = ?, password_hash = ? WHERE id = ? AND role = 'superadmin'",
      vu.username,
      hash,
      userId
    );
  } else {
    await db.run(
      "UPDATE users SET username = ? WHERE id = ? AND role = 'superadmin'",
      vu.username,
      userId
    );
  }

  return {
    data: {
      id: userId,
      username: vu.username,
      beforeUsername: row.username,
      passwordChanged: Boolean(pwd),
    },
  };
}

async function deleteAdminUser(id) {
  const db = await getDb();
  const row = await db.get("SELECT id, username, role FROM users WHERE id = ?", id);
  if (!row || row.role !== "admin") {
    return { error: "User admin tidak ditemukan", status: 404 };
  }

  await db.run("DELETE FROM user_menu_permissions WHERE user_id = ?", id);
  await db.run("DELETE FROM users WHERE id = ? AND role = 'admin'", id);
  return { data: { id, username: row.username } };
}

module.exports = {
  listAdminUsersPaged,
  getUserById,
  createAdminUser,
  updateAdminUser,
  updateSuperadminSelf,
  deleteAdminUser,
};
