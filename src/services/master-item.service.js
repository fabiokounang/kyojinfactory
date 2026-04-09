const { getDb } = require("../database/sqlite");
const { parsePage, parsePageSize, computePaginationMeta } = require("../lib/pagination");
const { normalizeCategoryFilter } = require("../config/master-item-filters");

const SEARCH_WHERE = `(lower(item_code) LIKE ? OR lower(item_name) LIKE ? OR lower(category) LIKE ?
  OR lower(supplier) LIKE ? OR lower(std_size) LIKE ? OR lower(unit_min) LIKE ?
  OR lower(default_storage_loc) LIKE ? OR lower(unit) LIKE ?)`;

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizePayload(payload) {
  return {
    itemCode: String(payload.itemCode || "").trim(),
    itemName: String(payload.itemName || "").trim(),
    category: String(payload.category || "").trim(),
    quantity: toNumber(payload.quantity),
    unit: String(payload.unit || "").trim(),
    stdSize: String(payload.stdSize || "").trim(),
    unitMin: String(payload.unitMin || "").trim(),
    minStock: toNumber(payload.minStock),
    maxStock: toNumber(payload.maxStock),
    reorderLevel: toNumber(payload.reorderLevel),
    defaultStorageLoc: String(payload.defaultStorageLoc || "").trim(),
    supplier: String(payload.supplier || "").trim(),
  };
}

function validateItemInput(payload) {
  const data = normalizePayload(payload);
  const requiredFields = ["itemCode", "itemName", "category", "unit"];

  for (const key of requiredFields) {
    if (!data[key]) {
      return `${key} is required`;
    }
  }

  return null;
}

function buildMasterItemListConditions(query, category) {
  const conditions = [];
  const params = [];

  const cat = normalizeCategoryFilter(category);
  if (cat) {
    conditions.push("category = ?");
    params.push(cat);
  }

  const q = String(query || "").trim();
  if (q) {
    const keyword = `%${q.toLowerCase()}%`;
    conditions.push(SEARCH_WHERE);
    params.push(keyword, keyword, keyword, keyword, keyword, keyword, keyword, keyword);
  }

  return { conditions, params };
}

async function listItems(query) {
  const db = await getDb();
  const { conditions, params } = buildMasterItemListConditions(query, "");
  const whereSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = await db.all(
    `SELECT * FROM master_items ${whereSql} ORDER BY id DESC`,
    ...params
  );
  return rows.map(mapRowToItem);
}

async function listItemsPaged({ q, category, page, pageSize }) {
  const db = await getDb();
  const { conditions, params } = buildMasterItemListConditions(q, category);
  const whereSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRow = await db.get(
    `SELECT COUNT(*) AS total FROM master_items ${whereSql}`,
    ...params
  );
  const total = Number(countRow?.total || 0);

  const ps = parsePageSize(pageSize);
  const meta = computePaginationMeta(total, parsePage(page), ps);

  const rows = await db.all(
    `SELECT * FROM master_items ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
    ...params,
    meta.pageSize,
    meta.offset
  );

  return {
    items: rows.map(mapRowToItem),
    total: meta.total,
    page: meta.page,
    pageSize: meta.pageSize,
    totalPages: meta.totalPages,
    from: meta.from,
    to: meta.to,
  };
}

async function createItem(payload, createdBy) {
  const db = await getDb();
  const error = validateItemInput(payload);
  if (error) {
    return { error };
  }

  const data = normalizePayload(payload);
  const exists = await db.get(
    "SELECT id FROM master_items WHERE item_code = ?",
    data.itemCode
  );
  if (exists) {
    return { error: "itemCode already exists" };
  }

  const now = new Date().toISOString();
  const runResult = await db.run(
    `INSERT INTO master_items (
      item_code, item_name, category, quantity, unit, std_size, unit_min,
      min_stock, max_stock, reorder_level, default_storage_loc, supplier,
      created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    data.itemCode,
    data.itemName,
    data.category,
    data.quantity,
    data.unit,
    data.stdSize,
    data.unitMin,
    data.minStock,
    data.maxStock,
    data.reorderLevel,
    data.defaultStorageLoc,
    data.supplier,
    createdBy || "system",
    now,
    now
  );

  const row = await db.get("SELECT * FROM master_items WHERE id = ?", runResult.lastID);
  return { data: mapRowToItem(row) };
}

async function updateItem(id, payload) {
  const db = await getDb();
  const current = await db.get("SELECT * FROM master_items WHERE id = ?", id);
  if (!current) {
    return { error: "Item not found", status: 404 };
  }

  const next = normalizePayload({
    ...mapRowToItem(current),
    ...payload,
  });

  const validationError = validateItemInput(next);
  if (validationError) {
    return { error: validationError };
  }

  const duplicateCode = await db.get(
    "SELECT id FROM master_items WHERE item_code = ? AND id <> ?",
    next.itemCode,
    id
  );
  if (duplicateCode && Number(duplicateCode.id) !== Number(id)) {
    return { error: "itemCode already exists" };
  }

  const updatedAt = new Date().toISOString();
  await db.run(
    `UPDATE master_items
     SET item_code = ?, item_name = ?, category = ?, quantity = ?, unit = ?,
         std_size = ?, unit_min = ?, min_stock = ?, max_stock = ?, reorder_level = ?,
         default_storage_loc = ?, supplier = ?, updated_at = ?
     WHERE id = ?`,
    next.itemCode,
    next.itemName,
    next.category,
    next.quantity,
    next.unit,
    next.stdSize,
    next.unitMin,
    next.minStock,
    next.maxStock,
    next.reorderLevel,
    next.defaultStorageLoc,
    next.supplier,
    updatedAt,
    id
  );

  const row = await db.get("SELECT * FROM master_items WHERE id = ?", id);
  return {
    data: mapRowToItem(row),
    before: mapRowToItem(current),
    after: mapRowToItem(row),
  };
}

async function deleteItem(id) {
  const db = await getDb();
  const row = await db.get("SELECT * FROM master_items WHERE id = ?", id);
  if (!row) {
    return { error: "Item not found", status: 404 };
  }

  await db.run("DELETE FROM master_items WHERE id = ?", id);
  return { data: mapRowToItem(row) };
}

function getByKeys(source, keys) {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }
  return "";
}

function getByNormalizedKey(source, normalizedCandidates) {
  const entries = Object.entries(source || {});
  for (const [rawKey, value] of entries) {
    const normalized = String(rawKey)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    if (normalizedCandidates.includes(normalized)) {
      return value;
    }
  }
  return "";
}

function normalizeExcelRow(row) {
  return {
    itemCode: String(
      getByKeys(row, ["Item Code", "item code", "ITEM CODE"]) ||
        getByNormalizedKey(row, ["itemcode"])
    ).trim(),
    itemName: String(
      getByKeys(row, ["Item Name", "item name", "ITEM NAME"]) ||
        getByNormalizedKey(row, ["itemname"])
    ).trim(),
    category: String(
      getByKeys(row, ["Category", "category", "CATEGORY"]) ||
        getByNormalizedKey(row, ["category"])
    ).trim(),
    quantity:
      getByKeys(row, ["Quantity", "quantity", "QUANTITY"]) ||
      getByNormalizedKey(row, ["quantity"]),
    unit: String(
      getByKeys(row, ["Stock Unit", "stock unit", "STOCK UNIT", "Unit", "unit", "UNIT"]) ||
        getByNormalizedKey(row, ["stockunit", "unit"])
    ).trim(),
    stdSize: String(
      getByKeys(row, ["Std. Size", "Std Size", "std size", "STD. SIZE"]) ||
        getByNormalizedKey(row, ["stdsize"])
    ).trim(),
    unitMin: String(
      getByKeys(row, ["Issue Unit", "issue unit", "ISSUE UNIT", "Unit_1", "Unit Min.", "Unit Min", "unit min"]) ||
        getByNormalizedKey(row, ["issueunit", "unit1", "unitmin"])
    ).trim(),
    minStock:
      getByKeys(row, ["Min. Stock", "Min Stock", "min stock"]) ||
      getByNormalizedKey(row, ["minstock"]),
    maxStock:
      getByKeys(row, ["Max. Stock", "Max Stock", "max stock"]) ||
      getByNormalizedKey(row, ["maxstock"]),
    reorderLevel:
      getByKeys(row, ["Reorder Level", "Reorder Level ", "reorder level"]) ||
      getByNormalizedKey(row, ["reorderlevel", "reorderlvl"]),
    defaultStorageLoc: String(
      getByKeys(row, ["Default Storage Loc.", "Default Storage Loc. ", "default storage loc"]) ||
        getByNormalizedKey(row, ["defaultstorageloc", "defaultstoragelocation"])
    ).trim(),
    supplier: String(
      getByKeys(row, ["Supplier", "supplier", "SUPPLIER"]) ||
        getByNormalizedKey(row, ["supplier"])
    ).trim(),
  };
}

async function importItems(rows, createdBy) {
  const db = await getDb();
  const result = {
    inserted: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (let index = 0; index < rows.length; index += 1) {
    const excelRow = rows[index] || {};
    const payload = normalizeExcelRow(excelRow);
    const validationError = validateItemInput(payload);
    if (validationError) {
      result.failed += 1;
      result.errors.push(`Row ${index + 2}: ${validationError}`);
      continue;
    }

    const data = normalizePayload(payload);
    const exists = await db.get(
      "SELECT id FROM master_items WHERE item_code = ?",
      data.itemCode
    );
    if (exists) {
      result.skipped += 1;
      continue;
    }

    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO master_items (
        item_code, item_name, category, quantity, unit, std_size, unit_min,
        min_stock, max_stock, reorder_level, default_storage_loc, supplier,
        created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      data.itemCode,
      data.itemName,
      data.category,
      data.quantity,
      data.unit,
      data.stdSize,
      data.unitMin,
      data.minStock,
      data.maxStock,
      data.reorderLevel,
      data.defaultStorageLoc,
      data.supplier,
      createdBy || "system",
      now,
      now
    );
    result.inserted += 1;
  }

  return result;
}

function mapRowToItem(row) {
  return {
    id: row.id,
    itemCode: row.item_code,
    itemName: row.item_name,
    category: row.category,
    quantity: row.quantity,
    unit: row.unit,
    stdSize: row.std_size,
    unitMin: row.unit_min,
    minStock: row.min_stock,
    maxStock: row.max_stock,
    reorderLevel: row.reorder_level,
    defaultStorageLoc: row.default_storage_loc,
    supplier: row.supplier,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = {
  listItems,
  listItemsPaged,
  createItem,
  updateItem,
  deleteItem,
  importItems,
};
