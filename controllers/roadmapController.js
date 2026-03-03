const Roadmap = require("../models/Roadmap");

const calculateProgress = (roadmap) => {
  let total = 0;
  let completed = 0;

  roadmap.checkpoints.forEach((cp) => {
    cp.milestones.forEach((ms) => {
      total++;
      if (ms.isCompleted) completed++;
    });
  });

  if (total === 0) return 0;
  return ((completed / total) * 100).toFixed(1);
};

exports.getRoadmaps = async (req, res) => {
  const roadmaps = await Roadmap.find({ userId: req.user._id });
  res.json(roadmaps);
};

exports.createRoadmap = async (req, res) => {
  const roadmap = await Roadmap.create({
    ...req.body,
    userId: req.user._id,
  });

  res.status(201).json(roadmap);
};

exports.completeMilestone = async (req, res) => {
  const { roadmapId, checkpointId, milestoneId } = req.params;

  const roadmap = await Roadmap.findOne({
    _id: roadmapId,
    userId: req.user._id,
  });

  if (!roadmap) return res.status(404).json({ message: "Not found" });

  const checkpoint = roadmap.checkpoints.id(checkpointId);
  const milestone = checkpoint?.milestones.id(milestoneId);

  if (!milestone) return res.status(404).json({ message: "Milestone not found" });

  milestone.isCompleted = true;
  milestone.completedAt = new Date();

  checkpoint.isCompleted = checkpoint.milestones.every((m) => m.isCompleted);

  roadmap.isCompleted = roadmap.checkpoints.every((c) => c.isCompleted);

  await roadmap.save();

  res.json(roadmap);
};
