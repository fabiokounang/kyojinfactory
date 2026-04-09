const { MENU_ITEMS, ADMIN_DEFAULT_MENU_KEYS, MENU_KEYS } = require("../config/menu");
const { getDb } = require("../database/sqlite");

function emptyPermissionMap() {
  return MENU_ITEMS.reduce((acc, item) => {
    acc[item.key] = false;
    return acc;
  }, {});
}

async function getUserPermissions(userId, role) {
  if (role === "superadmin") {
    return MENU_ITEMS.reduce((acc, item) => {
      acc[item.key] = true;
      return acc;
    }, {});
  }

  const db = await getDb();
  const rows = await db.all(
    "SELECT menu_key FROM user_menu_permissions WHERE user_id = ? AND can_access = 1",
    userId
  );
  const map = emptyPermissionMap();
  for (const row of rows) {
    if (Object.prototype.hasOwnProperty.call(map, row.menu_key)) {
      map[row.menu_key] = true;
    }
  }
  return map;
}

async function grantDefaultAdminPermissions(userId) {
  const db = await getDb();
  for (const key of ADMIN_DEFAULT_MENU_KEYS) {
    await db.run(
      `INSERT INTO user_menu_permissions (user_id, menu_key, can_access, updated_at)
       VALUES (?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE can_access = 1, updated_at = VALUES(updated_at)`,
      userId,
      key,
      new Date().toISOString()
    );
  }
}

async function setAdminPermissions(userId, menuKeys) {
  const db = await getDb();
  const now = new Date().toISOString();
  const allowed = new Set(menuKeys || []);

  for (const item of MENU_ITEMS) {
    if (item.key === MENU_KEYS.USER_MANAGEMENT) {
      continue;
    }

    const canAccess = allowed.has(item.key) ? 1 : 0;
    await db.run(
      `INSERT INTO user_menu_permissions (user_id, menu_key, can_access, updated_at)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE can_access = VALUES(can_access), updated_at = VALUES(updated_at)`,
      userId,
      item.key,
      canAccess,
      now
    );
  }
}

module.exports = {
  getUserPermissions,
  grantDefaultAdminPermissions,
  setAdminPermissions,
};
