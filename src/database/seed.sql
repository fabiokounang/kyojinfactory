INSERT OR IGNORE INTO users (username, password_hash, role, created_at)
VALUES ('superadmin', '{{SUPERADMIN_HASH}}', 'superadmin', '{{NOW_ISO}}');

INSERT OR IGNORE INTO users (username, password_hash, role, created_at)
VALUES ('admin', '{{ADMIN_HASH}}', 'admin', '{{NOW_ISO}}');

INSERT OR REPLACE INTO user_menu_permissions (user_id, menu_key, can_access, updated_at)
SELECT id, 'master-items', 1, '{{NOW_ISO}}'
FROM users
WHERE username = 'admin';

INSERT OR REPLACE INTO user_menu_permissions (user_id, menu_key, can_access, updated_at)
SELECT id, 'bom-structure', 1, '{{NOW_ISO}}'
FROM users
WHERE username = 'admin';
