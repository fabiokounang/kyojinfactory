-- =============================================================================
-- Migrasi — SQLite (jika Anda memakai file .sqlite, bukan MySQL)
-- Sama seperti fitur app: user_menu_permissions + activity_logs
-- Jalankan sekali; CREATE TABLE IF NOT EXISTS aman diulang.
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_menu_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  menu_key TEXT NOT NULL,
  can_access INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  UNIQUE (user_id, menu_key)
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  username TEXT NOT NULL,
  role TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  action TEXT NOT NULL,
  menu_key TEXT DEFAULT '',
  entity_type TEXT DEFAULT '',
  entity_id TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'success',
  note TEXT DEFAULT '',
  before_data TEXT,
  after_data TEXT,
  submitted_data TEXT,
  deleted_data TEXT,
  created_at TEXT NOT NULL
);

-- OPSIONAL — backfill admin yang sudah ada (uncomment jika perlu)
/*
INSERT INTO user_menu_permissions (user_id, menu_key, can_access, updated_at)
SELECT u.id, 'master-items', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM users u
WHERE u.role = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM user_menu_permissions p
    WHERE p.user_id = u.id AND p.menu_key = 'master-items'
  );

INSERT INTO user_menu_permissions (user_id, menu_key, can_access, updated_at)
SELECT u.id, 'bom-structure', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM users u
WHERE u.role = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM user_menu_permissions p
    WHERE p.user_id = u.id AND p.menu_key = 'bom-structure'
  );
*/
