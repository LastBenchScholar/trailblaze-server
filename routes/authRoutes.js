const express = require("express");
const router = express.Router();
const controller = require("../controllers/auth.controller");
const protect = require("../middlewares/auth.middleware");

router.post("/register", controller.register);
router.post("/login", controller.login);
router.get("/me", protect, controller.getMe);

module.exports = router;
