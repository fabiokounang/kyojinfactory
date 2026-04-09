const { getDb } = require("../database/sqlite");
const { parsePage, parsePageSize, computePaginationMeta } = require("../lib/pagination");

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizePayload(payload) {
  return {
    fgCode: String(payload.fgCode || "").trim(),
    parentCode: String(payload.parentCode || "").trim(),
    componentCode: String(payload.componentCode || "").trim(),
    componentName: String(payload.componentName || "").trim(),
    qtyPerParent: toNumber(payload.qtyPerParent),
    unit: String(payload.unit || "").trim(),
    lengthM: toNumber(payload.lengthM),
    wastePct: toNumber(payload.wastePct),
    rawMaterialCode: String(payload.rawMaterialCode || "").trim(),
  };
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

function normalizeExcelBomRow(row) {
  return {
    fgCode: String(
      getByKeys(row, ["FG CODE", "FG Code", "fg code"]) ||
        getByNormalizedKey(row, ["fgcode"])
    ).trim(),
    levelHint:
      getByKeys(row, ["LEVEL", "Level", "level"]) ||
      getByNormalizedKey(row, ["level"]),
    parentCode: String(
      getByKeys(row, ["PARENT CODE", "Parent Code", "parent code"]) ||
        getByNormalizedKey(row, ["parentcode"])
    ).trim(),
    componentCode: String(
      getByKeys(row, ["COMPONENT CODE", "Component Code", "component code"]) ||
        getByNormalizedKey(row, ["componentcode"])
    ).trim(),
    componentName: String(
      getByKeys(row, ["COMPONENT NAME", "Component Name", "component name"]) ||
        getByNormalizedKey(row, ["componentname"])
    ).trim(),
    qtyPerParent:
      getByKeys(row, ["QTY PER PARENT", "Qty Per Parent", "qty per parent"]) ||
      getByNormalizedKey(row, ["qtyperparent"]),
    unit: String(
      getByKeys(row, ["UNIT", "Unit", "unit"]) ||
        getByNormalizedKey(row, ["unit"])
    ).trim(),
    lengthM:
      getByKeys(row, ["LENGTH (M)", "Length (M)", "length (m)", "LENGTH M"]) ||
      getByNormalizedKey(row, ["lengthm", "length"]),
    wastePct:
      getByKeys(row, ["WASTE %", "Waste %", "waste %"]) ||
      getByNormalizedKey(row, ["waste"]),
    rawMaterialCode: String(
      getByKeys(row, ["RAW MATERIAL CODE", "Raw Material Code", "raw material code"]) ||
        getByNormalizedKey(row, ["rawmaterialcode"])
    ).trim(),
  };
}

async function listFgCodes() {
  const db = await getDb();
  const rows = await db.all(
    `SELECT item_code FROM master_items
     WHERE upper(category) = 'FG' OR upper(item_code) LIKE 'FG-%'
     ORDER BY item_code ASC`
  );
  return rows.map((row) => row.item_code);
}

async function listBomByFgCode(fgCode) {
  const db = await getDb();
  if (!fgCode) {
    return [];
  }

  const rows = await db.all(
    `SELECT * FROM bom_structures
     WHERE fg_code = ?
     ORDER BY level ASC, parent_code ASC, component_code ASC`,
    fgCode
  );
  return rows.map(mapRow);
}

function buildBomListConditions(filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.parentCode) {
    conditions.push("parent_code = ?");
    params.push(filters.parentCode);
  }

  if (filters.level) {
    conditions.push("level = ?");
    params.push(Number(filters.level));
  }

  if (filters.fgCode && String(filters.fgCode).trim()) {
    conditions.push("fg_code = ?");
    params.push(String(filters.fgCode).trim());
  }

  const q = String(filters.q || "").trim();
  if (q) {
    const keyword = `%${q.toLowerCase()}%`;
    conditions.push(
      `(lower(fg_code) LIKE ? OR lower(parent_code) LIKE ? OR lower(component_code) LIKE ?
        OR lower(component_name) LIKE ? OR lower(raw_material_code) LIKE ? OR lower(unit) LIKE ?)`
    );
    params.push(keyword, keyword, keyword, keyword, keyword, keyword);
  }

  return { conditions, params };
}

async function listBomRows(filters = {}) {
  const db = await getDb();
  const { conditions, params } = buildBomListConditions(filters);
  const whereSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = await db.all(
    `SELECT * FROM bom_structures
     ${whereSql}
     ORDER BY fg_code ASC, level ASC, parent_code ASC, component_code ASC`,
    ...params
  );

  return rows.map(mapRow);
}

async function listBomRowsPaged(filters = {}) {
  const db = await getDb();
  const { conditions, params } = buildBomListConditions(filters);
  const whereSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRow = await db.get(
    `SELECT COUNT(*) AS total FROM bom_structures ${whereSql}`,
    ...params
  );
  const total = Number(countRow?.total || 0);

  const ps = parsePageSize(filters.pageSize);
  const meta = computePaginationMeta(total, parsePage(filters.page), ps);

  const rows = await db.all(
    `SELECT * FROM bom_structures
     ${whereSql}
     ORDER BY fg_code ASC, level ASC, parent_code ASC, component_code ASC
     LIMIT ? OFFSET ?`,
    ...params,
    meta.pageSize,
    meta.offset
  );

  return {
    rows: rows.map(mapRow),
    total: meta.total,
    page: meta.page,
    pageSize: meta.pageSize,
    totalPages: meta.totalPages,
    from: meta.from,
    to: meta.to,
  };
}

async function listParentOptions(fgCode) {
  if (!fgCode) {
    return [];
  }

  const db = await getDb();
  const rows = await db.all(
    `SELECT component_code, MIN(level) AS level FROM bom_structures
     WHERE fg_code = ?
     GROUP BY component_code
     ORDER BY level ASC, component_code ASC`,
    fgCode
  );

  return [
    { code: fgCode, level: 0 },
    ...rows.map((row) => ({
      code: row.component_code,
      level: row.level,
    })),
  ];
}

async function listParentOptionsAll() {
  const db = await getDb();

  const fgRows = await db.all(
    `SELECT item_code FROM master_items
     WHERE upper(category) = 'FG' OR upper(item_code) LIKE 'FG-%'
     ORDER BY item_code ASC`
  );

  const bomRows = await db.all(
    `SELECT fg_code, component_code, MIN(level) AS level FROM bom_structures
     GROUP BY fg_code, component_code
     ORDER BY fg_code ASC, level ASC, component_code ASC`
  );

  const result = fgRows.map((row) => ({
    fgCode: row.item_code,
    code: row.item_code,
    level: 0,
    ref: `${row.item_code}::${row.item_code}`,
    label: `${row.item_code} (Level 0)`,
  }));

  for (const row of bomRows) {
    result.push({
      fgCode: row.fg_code,
      code: row.component_code,
      level: row.level,
      ref: `${row.fg_code}::${row.component_code}`,
      label: `${row.fg_code} :: ${row.component_code} (Level ${row.level})`,
    });
  }

  return result;
}

async function createBomRow(payload, createdBy) {
  const db = await getDb();
  const data = normalizePayload(payload);

  const parentRef = String(payload.parentRef || "").trim();
  if (parentRef && parentRef.includes("::")) {
    const [refFgCode, refParentCode] = parentRef.split("::");
    data.fgCode = String(refFgCode || "").trim();
    data.parentCode = String(refParentCode || "").trim();
  }

  if (!data.fgCode) return { error: "fgCode is required" };
  if (!data.parentCode) return { error: "parentCode is required" };
  if (!data.componentCode) return { error: "componentCode is required" };

  const fgExists = await db.get(
    "SELECT id FROM master_items WHERE item_code = ?",
    data.fgCode
  );
  if (!fgExists) {
    return { error: "fgCode not found in master items" };
  }

  let level = 1;
  if (data.parentCode === data.fgCode) {
    level = 1;
  } else {
    const parentRow = await db.get(
      "SELECT level FROM bom_structures WHERE fg_code = ? AND component_code = ? ORDER BY level DESC LIMIT 1",
      data.fgCode,
      data.parentCode
    );
    if (!parentRow) {
      return { error: "parentCode must exist as component_code in previous level" };
    }
    level = Number(parentRow.level) + 1;
  }

  const expectedLevel = payload.expectedLevel;
  const strictLevel = Boolean(payload.strictLevel);
  if (strictLevel) {
    const expectedLevelNumber = Math.floor(toNumber(expectedLevel));
    if (!expectedLevelNumber) {
      return { error: "LEVEL is required for strict import" };
    }
    if (expectedLevelNumber !== level) {
      return {
        error: `LEVEL mismatch: expected ${level} from parent, got ${expectedLevelNumber}`,
      };
    }
  }

  const exists = await db.get(
    "SELECT id FROM bom_structures WHERE fg_code = ? AND parent_code = ? AND component_code = ?",
    data.fgCode,
    data.parentCode,
    data.componentCode
  );
  if (exists) {
    return { error: "BOM row already exists for this fgCode + parentCode + componentCode" };
  }

  const now = new Date().toISOString();
  const result = await db.run(
    `INSERT INTO bom_structures (
      fg_code, level, parent_code, component_code, component_name, qty_per_parent,
      unit, length_m, waste_pct, raw_material_code, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    data.fgCode,
    level,
    data.parentCode,
    data.componentCode,
    data.componentName,
    data.qtyPerParent,
    data.unit,
    data.lengthM,
    data.wastePct,
    data.rawMaterialCode,
    createdBy || "system",
    now,
    now
  );

  const row = await db.get("SELECT * FROM bom_structures WHERE id = ?", result.lastID);
  return { data: mapRow(row) };
}

async function deleteBomRow(id) {
  const db = await getDb();
  const row = await db.get("SELECT * FROM bom_structures WHERE id = ?", id);
  if (!row) {
    return { error: "BOM row not found" };
  }

  await db.run("DELETE FROM bom_structures WHERE id = ?", id);
  return { data: mapRow(row) };
}

async function updateBomRow(id, payload) {
  const db = await getDb();
  const current = await db.get("SELECT * FROM bom_structures WHERE id = ?", id);
  if (!current) {
    return { error: "BOM row not found", status: 404 };
  }

  const data = normalizePayload({
    fgCode: payload.fgCode ?? current.fg_code,
    parentCode: payload.parentCode ?? current.parent_code,
    componentCode: payload.componentCode ?? current.component_code,
    componentName: payload.componentName ?? current.component_name,
    qtyPerParent: payload.qtyPerParent ?? current.qty_per_parent,
    unit: payload.unit ?? current.unit,
    lengthM: payload.lengthM ?? current.length_m,
    wastePct: payload.wastePct ?? current.waste_pct,
    rawMaterialCode: payload.rawMaterialCode ?? current.raw_material_code,
  });

  if (!data.fgCode) return { error: "fgCode is required" };
  if (!data.parentCode) return { error: "parentCode is required" };
  if (!data.componentCode) return { error: "componentCode is required" };

  const fgExists = await db.get(
    "SELECT id FROM master_items WHERE item_code = ?",
    data.fgCode
  );
  if (!fgExists) {
    return { error: "fgCode not found in master items" };
  }

  let level = 1;
  if (data.parentCode === data.fgCode) {
    level = 1;
  } else {
    const parentRow = await db.get(
      "SELECT level FROM bom_structures WHERE fg_code = ? AND component_code = ? ORDER BY level DESC LIMIT 1",
      data.fgCode,
      data.parentCode
    );
    if (!parentRow) {
      return { error: "parentCode must exist as component_code in previous level" };
    }
    level = Number(parentRow.level) + 1;
  }

  const duplicate = await db.get(
    "SELECT id FROM bom_structures WHERE fg_code = ? AND parent_code = ? AND component_code = ? AND id <> ?",
    data.fgCode,
    data.parentCode,
    data.componentCode,
    id
  );
  if (duplicate) {
    return { error: "BOM row already exists for this fgCode + parentCode + componentCode" };
  }

  const now = new Date().toISOString();
  await db.run(
    `UPDATE bom_structures
     SET fg_code = ?, level = ?, parent_code = ?, component_code = ?, component_name = ?,
         qty_per_parent = ?, unit = ?, length_m = ?, waste_pct = ?, raw_material_code = ?,
         updated_at = ?
     WHERE id = ?`,
    data.fgCode,
    level,
    data.parentCode,
    data.componentCode,
    data.componentName,
    data.qtyPerParent,
    data.unit,
    data.lengthM,
    data.wastePct,
    data.rawMaterialCode,
    now,
    id
  );

  const row = await db.get("SELECT * FROM bom_structures WHERE id = ?", id);
  return {
    data: mapRow(row),
    before: mapRow(current),
    after: mapRow(row),
  };
}

async function importBomRows(rows, createdBy, options = {}) {
  const result = {
    inserted: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };
  const startRowNumber = Number(options.startRowNumber || 2);

  const normalizedRows = rows.map((row, index) => {
    const normalized = normalizeExcelBomRow(row || {});
    return {
      ...normalized,
      __rowNumber: startRowNumber + index,
      __levelNumber: Math.max(1, Math.floor(toNumber(normalized.levelHint || 1))),
      __index: index,
    };
  });

  normalizedRows.sort((a, b) => {
    if (a.__levelNumber !== b.__levelNumber) {
      return a.__levelNumber - b.__levelNumber;
    }
    return a.__index - b.__index;
  });

  for (const item of normalizedRows) {
    const hasLevelValue = String(item.levelHint || "").trim().length > 0;
    if (!hasLevelValue) {
      result.failed += 1;
      result.errors.push(`Row ${item.__rowNumber}: LEVEL is required`);
      continue;
    }

    const payload = {
      fgCode: item.fgCode,
      parentCode: item.parentCode,
      componentCode: item.componentCode,
      componentName: item.componentName,
      qtyPerParent: item.qtyPerParent,
      unit: item.unit,
      lengthM: item.lengthM,
      wastePct: item.wastePct,
      rawMaterialCode: item.rawMaterialCode,
      expectedLevel: item.levelHint,
      strictLevel: true,
    };

    const response = await createBomRow(payload, createdBy);
    if (response.error) {
      if (response.error.includes("already exists")) {
        result.skipped += 1;
      } else {
        result.failed += 1;
        result.errors.push(`Row ${item.__rowNumber}: ${response.error}`);
      }
      continue;
    }
    result.inserted += 1;
  }

  return result;
}

function mapRow(row) {
  return {
    id: row.id,
    fgCode: row.fg_code,
    level: row.level,
    parentCode: row.parent_code,
    componentCode: row.component_code,
    componentName: row.component_name,
    qtyPerParent: row.qty_per_parent,
    unit: row.unit,
    lengthM: row.length_m,
    wastePct: row.waste_pct,
    rawMaterialCode: row.raw_material_code,
  };
}

module.exports = {
  listFgCodes,
  listBomByFgCode,
  listBomRows,
  listBomRowsPaged,
  listParentOptions,
  listParentOptionsAll,
  createBomRow,
  updateBomRow,
  deleteBomRow,
  importBomRows,
};
