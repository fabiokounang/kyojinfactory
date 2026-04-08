const express = require("express");
const {
  listMasterItemsHandler,
  createMasterItemHandler,
  updateMasterItemHandler,
  deleteMasterItemHandler,
} = require("../controllers/master-item.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(requireAuth);

router.get("/", listMasterItemsHandler);
router.post("/", createMasterItemHandler);
router.put("/:id", updateMasterItemHandler);
router.delete("/:id", deleteMasterItemHandler);

module.exports = router;
