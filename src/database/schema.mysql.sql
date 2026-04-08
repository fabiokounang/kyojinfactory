CREATE TABLE IF NOT EXISTS users (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL DEFAULT 'user',
  created_at VARCHAR(64) NOT NULL
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
