const express = require("express");
const multer = require("multer");
const {
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
} = require("../controllers/web.controller");
const {
  requireWebAuth,
  requireRole,
  requireMenuAccess,
} = require("../middlewares/web-auth.middleware");
const { MENU_KEYS } = require("../config/menu");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", (_req, res) => res.redirect("/login"));
router.get("/login", renderLoginPage);
router.post("/login", postLoginPage);
router.post("/logout", postLogoutPage);

router.get("/master-items", requireWebAuth, requireMenuAccess(MENU_KEYS.MASTER_ITEMS), renderMasterItemsPage);
router.post("/master-items", requireWebAuth, requireMenuAccess(MENU_KEYS.MASTER_ITEMS), postMasterItemsPage);
router.post("/master-items/:id/update", requireWebAuth, requireMenuAccess(MENU_KEYS.MASTER_ITEMS), postUpdateMasterItemPage);
router.post("/master-items/import", requireWebAuth, requireMenuAccess(MENU_KEYS.MASTER_ITEMS), upload.single("excelFile"), postImportMasterItemsPage);
router.post("/master-items/:id/delete", requireWebAuth, requireMenuAccess(MENU_KEYS.MASTER_ITEMS), postDeleteMasterItemPage);
router.get("/bom-structure", requireWebAuth, requireMenuAccess(MENU_KEYS.BOM_STRUCTURE), renderBomStructurePage);
router.post("/bom-structure", requireWebAuth, requireMenuAccess(MENU_KEYS.BOM_STRUCTURE), postBomStructurePage);
router.post("/bom-structure/:id/update", requireWebAuth, requireMenuAccess(MENU_KEYS.BOM_STRUCTURE), postUpdateBomStructurePage);
router.post("/bom-structure/import", requireWebAuth, requireMenuAccess(MENU_KEYS.BOM_STRUCTURE), upload.single("excelFileBom"), postImportBomStructurePage);
router.post("/bom-structure/:id/delete", requireWebAuth, requireMenuAccess(MENU_KEYS.BOM_STRUCTURE), postDeleteBomStructurePage);
router.get("/activity-logs", requireWebAuth, requireMenuAccess(MENU_KEYS.ACTIVITY_LOGS), renderActivityLogsPage);
router.get("/admin/users", requireWebAuth, requireRole(["superadmin"]), renderAdminUsersPage);
router.post("/admin/users/create", requireWebAuth, requireRole(["superadmin"]), postCreateAdminUserPage);
router.post("/admin/users/:id/update", requireWebAuth, requireRole(["superadmin"]), postAdminUserUpdatePage);
router.post("/admin/users/:id/delete", requireWebAuth, requireRole(["superadmin"]), postAdminUserDeletePage);
router.post("/admin/users/:id/permissions", requireWebAuth, requireRole(["superadmin"]), postAdminUserPermissionsPage);

module.exports = router;
