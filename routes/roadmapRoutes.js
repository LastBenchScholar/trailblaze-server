const express = require("express");
const router = express.Router();
const controller = require("../controllers/roadmapController");
const { protect } = require("../middlewares/authMiddleware");

router.get("/", protect, controller.getRoadmaps);
router.post("/", protect, controller.createRoadmap);
router.patch(
  "/:roadmapId/checkpoints/:checkpointId/milestones/:milestoneId/complete",
  protect,
  controller.completeMilestone,
);

module.exports = router;
