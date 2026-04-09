-- =============================================================================
-- Migrasi production — MySQL / MariaDB
-- Fitur: hak akses menu per admin, activity log, CRUD admin (tanpa ubah tabel users)
-- Jalankan SATU KALI pada database yang sudah punya tabel users (dan master_items / bom jika ada).
-- Aman diulang: CREATE TABLE IF NOT EXISTS.
-- =============================================================================

SET NAMES utf8mb4;

-- -----------------------------------------------------------------------------
-- 1. user_menu_permissions
-- Menyimpan checkbox menu untuk role admin (superadmin di app tidak memakai baris ini).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_menu_permissions (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  menu_key VARCHAR(100) NOT NULL,
  can_access TINYINT(1) NOT NULL DEFAULT 0,
  updated_at VARCHAR(64) NOT NULL,
  UNIQUE KEY uq_user_menu_permission (user_id, menu_key),
  INDEX idx_user_menu_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. activity_logs
-- Audit: IP, action, WIB ditampilkan di app dari ISO UTC di kolom created_at.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NULL,
  username VARCHAR(191) NOT NULL,
  role VARCHAR(100) NOT NULL,
  ip_address VARCHAR(191) NOT NULL,
  action VARCHAR(191) NOT NULL,
  menu_key VARCHAR(100) DEFAULT '',
  entity_type VARCHAR(191) DEFAULT '',
  entity_id VARCHAR(191) DEFAULT '',
  status VARCHAR(50) NOT NULL DEFAULT 'success',
  note VARCHAR(255) DEFAULT '',
  before_data LONGTEXT NULL,
  after_data LONGTEXT NULL,
  submitted_data LONGTEXT NULL,
  deleted_data LONGTEXT NULL,
  created_at VARCHAR(64) NOT NULL,
  INDEX idx_activity_created_at (created_at),
  INDEX idx_activity_username (username),
  INDEX idx_activity_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. OPSIONAL — backfill default menu untuk user yang sudah ada dengan role admin
--     (master-items + bom-structure), hanya jika belum ada baris permission-nya.
--     Superadmin tidak perlu baris di tabel ini (app menganggap full access).
--     Uncomment blok di bawah jika Anda ingin menjalankannya.
-- -----------------------------------------------------------------------------

/*
SET @ts = CONCAT(DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%dT%H:%i:%s'), 'Z');

INSERT INTO user_menu_permissions (user_id, menu_key, can_access, updated_at)
SELECT u.id, 'master-items', 1, @ts
FROM users u
WHERE u.role = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM user_menu_permissions p
    WHERE p.user_id = u.id AND p.menu_key = 'master-items'
  );

INSERT INTO user_menu_permissions (user_id, menu_key, can_access, updated_at)
SELECT u.id, 'bom-structure', 1, @ts
FROM users u
WHERE u.role = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM user_menu_permissions p
    WHERE p.user_id = u.id AND p.menu_key = 'bom-structure'
  );
*/
