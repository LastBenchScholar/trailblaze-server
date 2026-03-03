const express = require("express");
const router = express.Router();
const controller = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");

router.post("/register", controller.register);
router.post("/login", controller.login);
router.get("/me", protect, controller.getMe);

module.exports = router;
