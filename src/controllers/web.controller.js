const XLSX = require("xlsx");
const { login } = require("../services/auth.service");
const { MENU_ITEMS, MENU_KEYS } = require("../config/menu");
const {
  normalizeCategoryFilter,
  MASTER_CATEGORY_FILTER_OPTIONS,
} = require("../config/master-item-filters");
const {
  listItemsPaged,
  createItem,
  updateItem,
  deleteItem,
  importItems,
} = require("../services/master-item.service");
const {
  listBomRowsPaged,
  listParentOptionsAll,
  createBomRow,
  updateBomRow,
  deleteBomRow,
  importBomRows,
} = require("../services/bom-structure.service");
const { createActivityLog, listActivityLogsPaged } = require("../services/activity-log.service");
const {
  listAdminUsersPaged,
  getUserById,
  createAdminUser,
  updateAdminUser,
  updateSuperadminSelf,
  deleteAdminUser,
} = require("../services/admin.service");
const { setAdminPermissions, getUserPermissions } = require("../services/permission.service");
const { buildPaginationView, parsePage, parsePageSize } = require("../lib/pagination");

function buildNav(user, permissions, activeKey) {
  const canAccess = (itemKey) => {
    if (user?.role === "superadmin") return true;
    return Boolean(permissions?.[itemKey]);
  };

  return MENU_ITEMS.filter((item) => canAccess(item.key)).map((item) => ({
    ...item,
    active: item.key === activeKey,
  }));
}

async function resolveHomePath(user) {
  if (!user) return "/login";
  if (user.role === "superadmin") {
    return "/master-items";
  }

  const permissions = await getUserPermissions(user.id, user.role);
  if (permissions[MENU_KEYS.MASTER_ITEMS]) return "/master-items";
  if (permissions[MENU_KEYS.BOM_STRUCTURE]) return "/bom-structure";
  if (permissions[MENU_KEYS.ACTIVITY_LOGS]) return "/activity-logs";
  return "/login?error=Akun+Anda+belum+diberi+hak+akses+menu";
}

async function renderLoginPage(req, res) {
  if (req.session.user) {
    return res.redirect(await resolveHomePath(req.session.user));
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
    await createActivityLog({
      req,
      user: { username: String(username || ""), role: "guest" },
      action: "login.failed",
      menuKey: "auth",
      status: "failed",
      note: "invalid credentials",
      submittedData: { username: String(username || "") },
    });
    return res.redirect("/login?error=Username+atau+password+salah");
  }

  req.session.user = result.user;
  req.session.token = result.token;
  await createActivityLog({
    req,
    user: result.user,
    action: "login.success",
    menuKey: "auth",
    status: "success",
  });
  return res.redirect(await resolveHomePath(result.user));
}

function postLogoutPage(req, res) {
  const currentUser = req.session?.user;
  req.session.destroy(() => {
    if (currentUser) {
      createActivityLog({
        req,
        user: currentUser,
        action: "logout",
        menuKey: "auth",
        status: "success",
      }).catch(() => {});
    }
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
  const category = normalizeCategoryFilter(req.query.category);
  const page = parsePage(req.query.page);
  const pageSize = parsePageSize(req.query.pageSize);

  const result = await listItemsPaged({ q, category, page, pageSize });

  const queryParams = { pageSize: String(result.pageSize) };
  if (q) queryParams.q = q;
  if (category) queryParams.category = category;

  const pagination = buildPaginationView("/master-items", queryParams, {
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
    totalPages: result.totalPages,
    from: result.from,
    to: result.to,
  });

  return res.render("master-items", {
    title: "Master Items",
    user: req.session.user,
    q,
    category,
    categoryFilterOptions: MASTER_CATEGORY_FILTER_OPTIONS,
    items: result.items,
    pagination,
    error: req.query.error || "",
    msg: req.query.msg || "",
    navItems: buildNav(req.session.user, req.permissions, MENU_KEYS.MASTER_ITEMS),
  });
}

async function postMasterItemsPage(req, res) {
  const result = await createItem(req.body || {}, req.session.user?.username);
  if (result.error) {
    await createActivityLog({
      req,
      user: req.session.user,
      action: "master-item.create",
      menuKey: MENU_KEYS.MASTER_ITEMS,
      status: "failed",
      note: result.error,
      submittedData: req.body || {},
    });
    return res.redirect(`/master-items?error=${encodeURIComponent(result.error)}`);
  }

  await createActivityLog({
    req,
    user: req.session.user,
    action: "master-item.create",
    menuKey: MENU_KEYS.MASTER_ITEMS,
    entityType: "master_item",
    entityId: result.data?.id,
    submittedData: req.body || {},
    afterData: result.data,
  });
  return res.redirect("/master-items");
}

async function postDeleteMasterItemPage(req, res) {
  const result = await deleteItem(req.params.id);
  await createActivityLog({
    req,
    user: req.session.user,
    action: "master-item.delete",
    menuKey: MENU_KEYS.MASTER_ITEMS,
    entityType: "master_item",
    entityId: req.params.id,
    deletedData: result.data || null,
    status: result.error ? "failed" : "success",
    note: result.error || "",
  });
  return res.redirect("/master-items");
}

async function postUpdateMasterItemPage(req, res) {
  const result = await updateItem(req.params.id, req.body || {}, req.session.user?.username);
  if (result.error) {
    await createActivityLog({
      req,
      user: req.session.user,
      action: "master-item.update",
      menuKey: MENU_KEYS.MASTER_ITEMS,
      entityType: "master_item",
      entityId: req.params.id,
      status: "failed",
      note: result.error,
      submittedData: req.body || {},
    });
    return res.redirect(`/master-items?error=${encodeURIComponent(result.error)}`);
  }

  await createActivityLog({
    req,
    user: req.session.user,
    action: "master-item.update",
    menuKey: MENU_KEYS.MASTER_ITEMS,
    entityType: "master_item",
    entityId: req.params.id,
    beforeData: result.before,
    afterData: result.after,
    submittedData: req.body || {},
  });
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
    await createActivityLog({
      req,
      user: req.session.user,
      action: "master-item.import",
      menuKey: MENU_KEYS.MASTER_ITEMS,
      submittedData: { totalRows: rows.length },
      afterData: summary,
    });
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
  const fgCode = String(req.query.fgCode || "");
  const q = String(req.query.q || "");
  const page = parsePage(req.query.page);
  const pageSize = parsePageSize(req.query.pageSize);

  const result = await listBomRowsPaged({
    parentCode: parentFilter || undefined,
    level: levelFilter || undefined,
    fgCode: fgCode || undefined,
    q: q || undefined,
    page,
    pageSize,
  });
  const parentOptions = await listParentOptionsAll();

  const queryParams = { pageSize: String(result.pageSize) };
  if (parentFilter) queryParams.parentCode = parentFilter;
  if (levelFilter) queryParams.level = levelFilter;
  if (fgCode) queryParams.fgCode = fgCode;
  if (q) queryParams.q = q;

  const pagination = buildPaginationView("/bom-structure", queryParams, {
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
    totalPages: result.totalPages,
    from: result.from,
    to: result.to,
  });

  return res.render("bom-structure", {
    title: "BOM Structure",
    user: req.session.user,
    rows: result.rows,
    parentOptions,
    parentFilter,
    levelFilter,
    fgCode,
    q,
    pagination,
    error: req.query.error || "",
    msg: req.query.msg || "",
    navItems: buildNav(req.session.user, req.permissions, MENU_KEYS.BOM_STRUCTURE),
  });
}

async function postBomStructurePage(req, res) {
  const result = await createBomRow(req.body || {}, req.session.user?.username);
  if (result.error) {
    await createActivityLog({
      req,
      user: req.session.user,
      action: "bom.create",
      menuKey: MENU_KEYS.BOM_STRUCTURE,
      status: "failed",
      note: result.error,
      submittedData: req.body || {},
    });
    return res.redirect(`/bom-structure?error=${encodeURIComponent(result.error)}`);
  }

  await createActivityLog({
    req,
    user: req.session.user,
    action: "bom.create",
    menuKey: MENU_KEYS.BOM_STRUCTURE,
    entityType: "bom_structure",
    entityId: result.data?.id,
    submittedData: req.body || {},
    afterData: result.data,
  });
  return res.redirect("/bom-structure");
}

async function postDeleteBomStructurePage(req, res) {
  const result = await deleteBomRow(req.params.id);
  await createActivityLog({
    req,
    user: req.session.user,
    action: "bom.delete",
    menuKey: MENU_KEYS.BOM_STRUCTURE,
    entityType: "bom_structure",
    entityId: req.params.id,
    deletedData: result.data || null,
    status: result.error ? "failed" : "success",
    note: result.error || "",
  });
  return res.redirect("/bom-structure");
}

async function postUpdateBomStructurePage(req, res) {
  const result = await updateBomRow(req.params.id, req.body || {});
  if (result.error) {
    await createActivityLog({
      req,
      user: req.session.user,
      action: "bom.update",
      menuKey: MENU_KEYS.BOM_STRUCTURE,
      entityType: "bom_structure",
      entityId: req.params.id,
      status: "failed",
      note: result.error,
      submittedData: req.body || {},
    });
    return res.redirect(`/bom-structure?error=${encodeURIComponent(result.error)}`);
  }

  await createActivityLog({
    req,
    user: req.session.user,
    action: "bom.update",
    menuKey: MENU_KEYS.BOM_STRUCTURE,
    entityType: "bom_structure",
    entityId: req.params.id,
    beforeData: result.before,
    afterData: result.after,
    submittedData: req.body || {},
  });
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
    await createActivityLog({
      req,
      user: req.session.user,
      action: "bom.import",
      menuKey: MENU_KEYS.BOM_STRUCTURE,
      submittedData: { totalRows: rows.length },
      afterData: summary,
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

async function renderAdminUsersPage(req, res) {
  const q = String(req.query.q || "");
  const roleFilter = String(req.query.role || "all");
  const page = parsePage(req.query.page);
  const pageSize = parsePageSize(req.query.pageSize);

  const result = await listAdminUsersPaged({
    q,
    roleFilter: roleFilter === "all" ? "" : roleFilter,
    page,
    pageSize,
  });

  const queryParams = { pageSize: String(result.pageSize) };
  if (q) queryParams.q = q;
  if (roleFilter && roleFilter !== "all") queryParams.role = roleFilter;

  const pagination = buildPaginationView("/admin/users", queryParams, {
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
    totalPages: result.totalPages,
    from: result.from,
    to: result.to,
  });

  return res.render("admin-users", {
    title: "Kelola admin",
    user: req.session.user,
    users: result.users,
    pagination,
    filterQ: q,
    roleFilter,
    navItems: buildNav(req.session.user, req.permissions, MENU_KEYS.USER_MANAGEMENT),
    msg: req.query.msg || "",
    error: req.query.error || "",
    menuItems: MENU_ITEMS.filter((item) => item.key !== MENU_KEYS.USER_MANAGEMENT),
  });
}

async function postCreateAdminUserPage(req, res) {
  const { username, password } = req.body || {};
  const result = await createAdminUser({ username, password });
  if (result.error) {
    await createActivityLog({
      req,
      user: req.session.user,
      action: "admin.user.create",
      menuKey: MENU_KEYS.USER_MANAGEMENT,
      status: "failed",
      note: result.error,
      submittedData: { username: String(username || "").trim() },
    });
    return res.redirect(`/admin/users?error=${encodeURIComponent(result.error)}`);
  }

  await createActivityLog({
    req,
    user: req.session.user,
    action: "admin.user.create",
    menuKey: MENU_KEYS.USER_MANAGEMENT,
    entityType: "user",
    entityId: result.data.id,
    submittedData: { username: result.data.username },
    afterData: result.data,
  });
  return res.redirect("/admin/users?msg=Admin+baru+berhasil+ditambahkan");
}

async function postAdminUserUpdatePage(req, res) {
  const targetUserId = Number(req.params.id);
  const sessionUser = req.session.user;
  const { username, password, currentPassword } = req.body || {};

  const targetUser = await getUserById(targetUserId);
  if (!targetUser) {
    return res.redirect(`/admin/users?error=${encodeURIComponent("User tidak ditemukan")}`);
  }

  if (targetUser.role === "superadmin") {
    if (Number(sessionUser.id) !== targetUserId) {
      return res.redirect(
        `/admin/users?error=${encodeURIComponent("Tidak bisa mengubah akun superadmin lain")}`
      );
    }

    const result = await updateSuperadminSelf(targetUserId, {
      currentPassword,
      username,
      newPassword: password,
    });
    if (result.error) {
      await createActivityLog({
        req,
        user: req.session.user,
        action: "admin.superadmin.self.update",
        menuKey: MENU_KEYS.USER_MANAGEMENT,
        entityType: "user",
        entityId: targetUserId,
        status: "failed",
        note: result.error,
        submittedData: {
          username: String(username || "").trim(),
          passwordChanged: Boolean(String(password || "").trim()),
        },
      });
      return res.redirect(`/admin/users?error=${encodeURIComponent(result.error)}`);
    }

    req.session.user = {
      ...sessionUser,
      username: result.data.username,
    };

    await createActivityLog({
      req,
      user: req.session.user,
      action: "admin.superadmin.self.update",
      menuKey: MENU_KEYS.USER_MANAGEMENT,
      entityType: "user",
      entityId: targetUserId,
      beforeData: { username: result.data.beforeUsername },
      afterData: {
        username: result.data.username,
        passwordChanged: result.data.passwordChanged,
      },
      submittedData: { passwordChanged: result.data.passwordChanged },
    });
    return res.redirect(
      `/admin/users?msg=${encodeURIComponent("Profil superadmin berhasil diperbarui")}`
    );
  }

  if (targetUser.role !== "admin") {
    return res.redirect("/admin/users?error=User+admin+tidak+ditemukan");
  }

  const result = await updateAdminUser(targetUserId, { username, password });
  if (result.error) {
    await createActivityLog({
      req,
      user: req.session.user,
      action: "admin.user.update",
      menuKey: MENU_KEYS.USER_MANAGEMENT,
      entityType: "user",
      entityId: targetUserId,
      status: "failed",
      note: result.error,
      submittedData: { username: String(username || "").trim(), passwordChanged: Boolean(String(password || "").trim()) },
    });
    return res.redirect(`/admin/users?error=${encodeURIComponent(result.error)}`);
  }

  await createActivityLog({
    req,
    user: req.session.user,
    action: "admin.user.update",
    menuKey: MENU_KEYS.USER_MANAGEMENT,
    entityType: "user",
    entityId: targetUserId,
    beforeData: { username: result.data.beforeUsername },
    afterData: {
      username: result.data.username,
      passwordChanged: result.data.passwordChanged,
    },
    submittedData: { username: result.data.username, passwordChanged: result.data.passwordChanged },
  });
  return res.redirect("/admin/users?msg=Data+admin+berhasil+diperbarui");
}

async function postAdminUserDeletePage(req, res) {
  const targetUserId = Number(req.params.id);
  const result = await deleteAdminUser(targetUserId);
  if (result.error) {
    return res.redirect(`/admin/users?error=${encodeURIComponent(result.error)}`);
  }

  await createActivityLog({
    req,
    user: req.session.user,
    action: "admin.user.delete",
    menuKey: MENU_KEYS.USER_MANAGEMENT,
    entityType: "user",
    entityId: targetUserId,
    deletedData: result.data,
  });
  return res.redirect("/admin/users?msg=Admin+berhasil+dihapus");
}

async function postAdminUserPermissionsPage(req, res) {
  const targetUserId = Number(req.params.id);
  const targetUser = await getUserById(targetUserId);
  if (!targetUser || targetUser.role !== "admin") {
    return res.redirect("/admin/users?error=User+admin+tidak+ditemukan");
  }

  const selectedMenuKeys = req.body?.menuKeys;
  const normalized = Array.isArray(selectedMenuKeys)
    ? selectedMenuKeys
    : selectedMenuKeys
      ? [selectedMenuKeys]
      : [];

  await setAdminPermissions(targetUserId, normalized);
  await createActivityLog({
    req,
    user: req.session.user,
    action: "admin.permission.update",
    menuKey: MENU_KEYS.USER_MANAGEMENT,
    entityType: "user",
    entityId: targetUserId,
    submittedData: { menuKeys: normalized },
  });
  return res.redirect("/admin/users?msg=Hak+akses+admin+berhasil+diupdate");
}

async function renderActivityLogsPage(req, res) {
  const username = String(req.query.username || "");
  const action = String(req.query.action || "");
  const menuKey = String(req.query.menuKey || "");
  const status = String(req.query.status || "");
  const ip = String(req.query.ip || "");
  const role = String(req.query.role || "");
  const page = parsePage(req.query.page);
  const pageSize = parsePageSize(req.query.pageSize);

  const result = await listActivityLogsPaged({
    username,
    action,
    menuKey,
    status,
    ip,
    role,
    page,
    pageSize,
  });

  const queryParams = { pageSize: String(result.pageSize) };
  if (username) queryParams.username = username;
  if (action) queryParams.action = action;
  if (menuKey) queryParams.menuKey = menuKey;
  if (status) queryParams.status = status;
  if (ip) queryParams.ip = ip;
  if (role) queryParams.role = role;

  const pagination = buildPaginationView("/activity-logs", queryParams, {
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
    totalPages: result.totalPages,
    from: result.from,
    to: result.to,
  });

  const menuKeyOptions = [
    { value: "", label: "Semua menu" },
    { value: "auth", label: "Auth / login" },
    ...MENU_ITEMS.map((item) => ({ value: item.key, label: item.label })),
  ];

  return res.render("activity-logs", {
    title: "Activity Logs",
    user: req.session.user,
    navItems: buildNav(req.session.user, req.permissions, MENU_KEYS.ACTIVITY_LOGS),
    logs: result.logs,
    username,
    action,
    menuKey,
    status,
    ip,
    role,
    menuKeyOptions,
    pagination,
  });
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
  renderAdminUsersPage,
  postCreateAdminUserPage,
  postAdminUserUpdatePage,
  postAdminUserDeletePage,
  postAdminUserPermissionsPage,
  renderActivityLogsPage,
};
