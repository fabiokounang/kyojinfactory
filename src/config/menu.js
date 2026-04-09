const MENU_KEYS = {
  MASTER_ITEMS: "master-items",
  BOM_STRUCTURE: "bom-structure",
  ACTIVITY_LOGS: "activity-logs",
  USER_MANAGEMENT: "user-management",
};

const MENU_ITEMS = [
  { key: MENU_KEYS.USER_MANAGEMENT, label: "Admin Menu Access", path: "/admin/users" },
  { key: MENU_KEYS.MASTER_ITEMS, label: "Master Items", path: "/master-items" },
  { key: MENU_KEYS.BOM_STRUCTURE, label: "BOM Structure", path: "/bom-structure" },
  { key: MENU_KEYS.ACTIVITY_LOGS, label: "Activity Logs", path: "/activity-logs" },
];

const ADMIN_DEFAULT_MENU_KEYS = [
  MENU_KEYS.MASTER_ITEMS,
  MENU_KEYS.BOM_STRUCTURE,
];

module.exports = {
  MENU_KEYS,
  MENU_ITEMS,
  ADMIN_DEFAULT_MENU_KEYS,
};
