CREATE TABLE IF NOT EXISTS users (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL DEFAULT 'user',
  created_at VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_menu_permissions (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  menu_key VARCHAR(100) NOT NULL,
  can_access TINYINT(1) NOT NULL DEFAULT 0,
  updated_at VARCHAR(64) NOT NULL,
  UNIQUE KEY uq_user_menu_permission (user_id, menu_key),
  INDEX idx_user_menu_user_id (user_id)
);

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
);

CREATE TABLE IF NOT EXISTS master_items (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  item_code VARCHAR(191) NOT NULL UNIQUE,
  item_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  quantity DOUBLE NOT NULL DEFAULT 0,
  unit VARCHAR(50) NOT NULL,
  std_size VARCHAR(100) DEFAULT '',
  unit_min VARCHAR(100) DEFAULT '',
  min_stock DOUBLE NOT NULL DEFAULT 0,
  max_stock DOUBLE NOT NULL DEFAULT 0,
  reorder_level DOUBLE NOT NULL DEFAULT 0,
  default_storage_loc VARCHAR(255) DEFAULT '',
  supplier VARCHAR(255) DEFAULT '',
  created_by VARCHAR(100) DEFAULT 'system',
  created_at VARCHAR(64) NOT NULL,
  updated_at VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS bom_structures (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  fg_code VARCHAR(191) NOT NULL,
  level INT NOT NULL,
  parent_code VARCHAR(191) NOT NULL,
  component_code VARCHAR(191) NOT NULL,
  component_name VARCHAR(255) DEFAULT '',
  qty_per_parent DOUBLE NOT NULL DEFAULT 0,
  unit VARCHAR(50) DEFAULT '',
  length_m DOUBLE NOT NULL DEFAULT 0,
  waste_pct DOUBLE NOT NULL DEFAULT 0,
  raw_material_code VARCHAR(191) DEFAULT '',
  created_by VARCHAR(100) DEFAULT 'system',
  created_at VARCHAR(64) NOT NULL,
  updated_at VARCHAR(64) NOT NULL,
  UNIQUE KEY uq_bom_fg_parent_component (fg_code, parent_code, component_code)
);
