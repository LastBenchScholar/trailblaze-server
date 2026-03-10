const express = require("express");
const router = express.Router();
const controller = require("../controllers/roadmapController");
const { protect } = require("../middlewares/authMiddleware");

router.get("/", protect, controller.getRoadmaps);
router.get("/:id", protect, controller.getRoadmap);
router.post("/", protect, controller.createRoadmap);
router.patch("/:id", protect, controller.updateRoadmap);
router.delete("/:id", protect, controller.deleteRoadmap);

router.post("/:roadmapId/checkpoints", protect, controller.addCheckpoint);
router.patch("/:roadmapId/checkpoints/:checkpointId", protect, controller.updateCheckpoint);
router.delete("/:roadmapId/checkpoints/:checkpointId", protect, controller.deleteCheckpoint);

router.post("/:roadmapId/checkpoints/:checkpointId/milestones", protect, controller.addMilestone);
router.patch(
  "/:roadmapId/checkpoints/:checkpointId/milestones/:milestoneId",
  protect,
  controller.updateMilestone,
);
router.delete(
  "/:roadmapId/checkpoints/:checkpointId/milestones/:milestoneId",
  protect,
  controller.deleteMilestone,
);
router.patch(
  "/:roadmapId/checkpoints/:checkpointId/milestones/:milestoneId/complete",
  protect,
  controller.completeMilestone,
);

module.exports = router;
