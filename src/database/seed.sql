INSERT OR IGNORE INTO users (username, password_hash, role, created_at)
VALUES ('superadmin', '{{SUPERADMIN_HASH}}', 'superadmin', '{{NOW_ISO}}');

INSERT OR IGNORE INTO users (username, password_hash, role, created_at)
VALUES ('admin', '{{ADMIN_HASH}}', 'admin', '{{NOW_ISO}}');
