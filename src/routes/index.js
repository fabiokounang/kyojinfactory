const express = require("express");
const { getHealth } = require("../controllers/health.controller");
const authRoutes = require("./auth.routes");
const masterItemRoutes = require("./master-item.routes");

const router = express.Router();

router.get("/health", getHealth);
router.use("/auth", authRoutes);
router.use("/master-items", masterItemRoutes);

module.exports = router;
