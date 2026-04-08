const XLSX = require("xlsx");
const { login } = require("../services/auth.service");
const {
  listItems,
  createItem,
  updateItem,
  deleteItem,
  importItems,
} = require("../services/master-item.service");
const {
  listBomRows,
  listParentOptionsAll,
  createBomRow,
  updateBomRow,
  deleteBomRow,
  importBomRows,
} = require("../services/bom-structure.service");

function renderLoginPage(req, res) {
  if (req.session.user) {
    return res.redirect("/master-items");
  }

  return res.render("login", {
    title: "Login",
    error: req.query.error || "",
  });
}

async function postLoginPage(req, res) {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.redirect("/login?error=Username+dan+password+wajib+diisi");
  }

  const result = await login(String(username), String(password));
  if (!result) {
    return res.redirect("/login?error=Username+atau+password+salah");
  }

  req.session.user = result.user;
  req.session.token = result.token;
  return res.redirect("/master-items");
}

function postLogoutPage(req, res) {
  req.session.destroy(() => {
    res.redirect("/login");
  });
}

function normalizeHeaderName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function findMasterItemHeaderRow(sheet) {
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  const maxScan = Math.min(matrix.length, 25);
  for (let rowIndex = 0; rowIndex < maxScan; rowIndex += 1) {
    const row = matrix[rowIndex] || [];
    const normalized = row.map(normalizeHeaderName);
    const hasItemCode = normalized.includes("itemcode");
    const hasItemName = normalized.includes("itemname");
    const hasCategory = normalized.includes("category");
    if (hasItemCode && hasItemName && hasCategory) {
      return rowIndex;
    }
  }

  return -1;
}

function findBomHeaderRow(sheet) {
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  const maxScan = Math.min(matrix.length, 30);
  for (let rowIndex = 0; rowIndex < maxScan; rowIndex += 1) {
    const row = matrix[rowIndex] || [];
    const normalized = row.map(normalizeHeaderName);
    const hasFgCode = normalized.includes("fgcode");
    const hasParentCode = normalized.includes("parentcode");
    const hasComponentCode = normalized.includes("componentcode");
    const hasComponentName = normalized.includes("componentname");
    if (hasFgCode && hasParentCode && hasComponentCode && hasComponentName) {
      return rowIndex;
    }
  }

  return -1;
}

async function renderMasterItemsPage(req, res) {
  const q = String(req.query.q || "");
  const items = await listItems(q);
  return res.render("master-items", {
    title: "Master Items",
    user: req.session.user,
    q,
    items,
    error: req.query.error || "",
    msg: req.query.msg || "",
  });
}

async function postMasterItemsPage(req, res) {
  const result = await createItem(req.body || {}, req.session.user?.username);
  if (result.error) {
    return res.redirect(`/master-items?error=${encodeURIComponent(result.error)}`);
  }

  return res.redirect("/master-items");
}

async function postDeleteMasterItemPage(req, res) {
  await deleteItem(req.params.id);
  return res.redirect("/master-items");
}

async function postUpdateMasterItemPage(req, res) {
  const result = await updateItem(req.params.id, req.body || {});
  if (result.error) {
    return res.redirect(`/master-items?error=${encodeURIComponent(result.error)}`);
  }

  return res.redirect("/master-items?msg=Master+item+updated");
}

async function postImportMasterItemsPage(req, res) {
  if (!req.file || !req.file.buffer) {
    return res.redirect("/master-items?error=File+Excel+wajib+dipilih");
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return res.redirect("/master-items?error=Sheet+Excel+tidak+ditemukan");
    }

    const sheet = workbook.Sheets[firstSheetName];
    const headerRowIndex = findMasterItemHeaderRow(sheet);
    if (headerRowIndex === -1) {
      return res.redirect("/master-items?error=Header+kolom+Master+Item+tidak+ditemukan+di+Excel");
    }

    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      range: headerRowIndex,
    });
    if (!rows.length) {
      return res.redirect("/master-items?error=Data+Excel+kosong");
    }

    const summary = await importItems(rows, req.session.user?.username);
    const msg = `Import selesai. Inserted=${summary.inserted}, Skipped=${summary.skipped}, Failed=${summary.failed}`;
    if (summary.failed > 0) {
      const firstError = summary.errors[0] || "Ada baris yang gagal";
      return res.redirect(`/master-items?msg=${encodeURIComponent(msg)}&error=${encodeURIComponent(firstError)}`);
    }
    return res.redirect(`/master-items?msg=${encodeURIComponent(msg)}`);
  } catch (error) {
    return res.redirect(`/master-items?error=${encodeURIComponent(`Gagal parse Excel: ${error.message}`)}`);
  }
}

async function renderBomStructurePage(req, res) {
  const parentFilter = String(req.query.parentCode || "");
  const levelFilter = String(req.query.level || "");
  const rows = await listBomRows({
    parentCode: parentFilter,
    level: levelFilter,
  });
  const parentOptions = await listParentOptionsAll();

  return res.render("bom-structure", {
    title: "BOM Structure",
    user: req.session.user,
    rows,
    parentOptions,
    parentFilter,
    levelFilter,
    error: req.query.error || "",
    msg: req.query.msg || "",
  });
}

async function postBomStructurePage(req, res) {
  const result = await createBomRow(req.body || {}, req.session.user?.username);
  if (result.error) {
    return res.redirect(`/bom-structure?error=${encodeURIComponent(result.error)}`);
  }

  return res.redirect("/bom-structure");
}

async function postDeleteBomStructurePage(req, res) {
  await deleteBomRow(req.params.id);
  return res.redirect("/bom-structure");
}

async function postUpdateBomStructurePage(req, res) {
  const result = await updateBomRow(req.params.id, req.body || {});
  if (result.error) {
    return res.redirect(`/bom-structure?error=${encodeURIComponent(result.error)}`);
  }

  return res.redirect("/bom-structure?msg=BOM+row+updated");
}

async function postImportBomStructurePage(req, res) {
  if (!req.file || !req.file.buffer) {
    return res.redirect("/bom-structure?error=File+Excel+wajib+dipilih");
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return res.redirect("/bom-structure?error=Sheet+Excel+tidak+ditemukan");
    }

    const sheet = workbook.Sheets[firstSheetName];
    const headerRowIndex = findBomHeaderRow(sheet);
    if (headerRowIndex === -1) {
      return res.redirect("/bom-structure?error=Header+kolom+BOM+tidak+ditemukan+di+Excel");
    }

    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      range: headerRowIndex,
    });
    if (!rows.length) {
      return res.redirect("/bom-structure?error=Data+Excel+BOM+kosong");
    }

    const summary = await importBomRows(rows, req.session.user?.username, {
      startRowNumber: headerRowIndex + 2,
    });
    const msg = `Import BOM selesai. Inserted=${summary.inserted}, Skipped=${summary.skipped}, Failed=${summary.failed}`;
    if (summary.failed > 0) {
      const firstError = summary.errors[0] || "Ada baris BOM yang gagal";
      return res.redirect(`/bom-structure?msg=${encodeURIComponent(msg)}&error=${encodeURIComponent(firstError)}`);
    }

    return res.redirect(`/bom-structure?msg=${encodeURIComponent(msg)}`);
  } catch (error) {
    return res.redirect(`/bom-structure?error=${encodeURIComponent(`Gagal parse Excel BOM: ${error.message}`)}`);
  }
}

module.exports = {
  renderLoginPage,
  postLoginPage,
  postLogoutPage,
  renderMasterItemsPage,
  postMasterItemsPage,
  postUpdateMasterItemPage,
  postDeleteMasterItemPage,
  postImportMasterItemsPage,
  renderBomStructurePage,
  postBomStructurePage,
  postUpdateBomStructurePage,
  postDeleteBomStructurePage,
  postImportBomStructurePage,
};
