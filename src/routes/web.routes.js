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
} = require("../controllers/web.controller");
const { requireWebAuth } = require("../middlewares/web-auth.middleware");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", (_req, res) => res.redirect("/login"));
router.get("/login", renderLoginPage);
router.post("/login", postLoginPage);
router.post("/logout", postLogoutPage);

router.get("/master-items", requireWebAuth, renderMasterItemsPage);
router.post("/master-items", requireWebAuth, postMasterItemsPage);
router.post("/master-items/:id/update", requireWebAuth, postUpdateMasterItemPage);
router.post("/master-items/import", requireWebAuth, upload.single("excelFile"), postImportMasterItemsPage);
router.post("/master-items/:id/delete", requireWebAuth, postDeleteMasterItemPage);
router.get("/bom-structure", requireWebAuth, renderBomStructurePage);
router.post("/bom-structure", requireWebAuth, postBomStructurePage);
router.post("/bom-structure/:id/update", requireWebAuth, postUpdateBomStructurePage);
router.post("/bom-structure/import", requireWebAuth, upload.single("excelFileBom"), postImportBomStructurePage);
router.post("/bom-structure/:id/delete", requireWebAuth, postDeleteBomStructurePage);

module.exports = router;
