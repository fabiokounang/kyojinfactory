const express = require("express");
const { loginHandler, meHandler } = require("../controllers/auth.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/login", loginHandler);
router.get("/me", requireAuth, meHandler);

module.exports = router;
