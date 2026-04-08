CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS master_items (
  id BIGSERIAL PRIMARY KEY,
  item_code TEXT NOT NULL UNIQUE,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  std_size TEXT DEFAULT '',
  unit_min TEXT DEFAULT '',
  min_stock DOUBLE PRECISION NOT NULL DEFAULT 0,
  max_stock DOUBLE PRECISION NOT NULL DEFAULT 0,
  reorder_level DOUBLE PRECISION NOT NULL DEFAULT 0,
  default_storage_loc TEXT DEFAULT '',
  supplier TEXT DEFAULT '',
  created_by TEXT DEFAULT 'system',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bom_structures (
  id BIGSERIAL PRIMARY KEY,
  fg_code TEXT NOT NULL,
  level INTEGER NOT NULL,
  parent_code TEXT NOT NULL,
  component_code TEXT NOT NULL,
  component_name TEXT DEFAULT '',
  qty_per_parent DOUBLE PRECISION NOT NULL DEFAULT 0,
  unit TEXT DEFAULT '',
  length_m DOUBLE PRECISION NOT NULL DEFAULT 0,
  waste_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
  raw_material_code TEXT DEFAULT '',
  created_by TEXT DEFAULT 'system',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (fg_code, parent_code, component_code)
);
