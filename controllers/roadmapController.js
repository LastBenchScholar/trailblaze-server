const Roadmap = require("../models/Roadmap");
const { AppError } = require("../utils/utility");
const {
  isValidObjectId,
  roadmapResponse,
  recalculateCompletion,
  sanitizeRoadmapPayload,
  sanitizeCheckpointPayload,
  sanitizeMilestonePayload,
} = require("../utils/roadmapHelper");

/**
 * List user roadmaps with optional query filters for completion status and category.
 * @route /api/roadmaps
 * @query isCompleted, category
 * @method GET
 */
module.exports.getRoadmaps = async (req, res) => {
  try {
    const query = { userId: req.user._id };

    // Attach query filters if provided
    if (req.query.isCompleted === "true") query.isCompleted = true;
    else query.isCompleted = false;
    if (req.query.category) query.category = req.query.category;

    // Fetch roadmaps
    const roadmaps = await Roadmap.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      message: "Roadmaps retrieved successfully",
      data: roadmaps.map(roadmapResponse),
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

/**
 * Get a single roadmap
 * @route /api/roadmaps/:id
 * @method GET
 * @param id - Roadmap ID
 */
module.exports.getRoadmap = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) throw new AppError("Invalid roadmap id", 400);

    const roadmap = await Roadmap.findOne({ userId: req.user._id, _id: id });
    if (!roadmap) throw new AppError("Roadmap not found", 404);

    res.status(200).json({
      status: "success",
      message: "Roadmap retrieved successfully",
      data: roadmapResponse(roadmap),
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

/**
 * Create a roadmap
 * @route /api/roadmaps
 * @body title, description, category, deadline
 * @method POST
 */
module.exports.createRoadmap = async (req, res) => {
  try {
    const body = req.body || {};
    const allowedFields = ["title", "description", "category", "deadline", "checkpoints"];
    const payload = {};

    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        payload[field] = body[field];
      }
    });

    if (!payload.title) throw new AppError("Title is required", 400);

    if (Object.prototype.hasOwnProperty.call(payload, "deadline") && payload.deadline) {
      const date = new Date(payload.deadline);
      if (Number.isNaN(date.getTime())) throw new AppError("Invalid deadline date", 400);
      payload.deadline = date;
    }

    const roadmap = await Roadmap.create({
      ...payload,
      userId: req.user._id,
    });

    recalculateCompletion(roadmap);
    await roadmap.save();

    res.status(201).json({
      status: "success",
      data: roadmapResponse(roadmap),
      message: "Roadmap created successfully",
    });
  } catch (error) {
    console.log(error);
    res
      .status(error.statusCode || 500)
      .json({ status: "error", message: error.message || "Server Error" });
  }
};

/**
 * Update roadmap metadata and nested checkpoints.
 * @route PATCH /api/roadmaps/:id
 */
module.exports.updateRoadmap = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid roadmap id" });

    const { payload, error } = sanitizeRoadmapPayload(req.body, { partial: true });
    if (error) return res.status(400).json({ message: error });

    const roadmap = await Roadmap.findOne({ _id: id, userId: req.user._id });
    if (!roadmap) return res.status(404).json({ message: "Roadmap not found" });

    Object.assign(roadmap, payload);
    recalculateCompletion(roadmap);
    await roadmap.save();

    res.json(roadmapResponse(roadmap));
  } catch (errorResponse) {
    res.status(500).json({ message: errorResponse.message });
  }
};

/**
 * Delete roadmap by id.
 * @route DELETE /api/roadmaps/:id
 */
module.exports.deleteRoadmap = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid roadmap id" });

    const roadmap = await Roadmap.findOneAndDelete({ _id: id, userId: req.user._id });
    if (!roadmap) return res.status(404).json({ message: "Roadmap not found" });

    res.status(204).send();
  } catch (errorResponse) {
    res.status(500).json({ message: errorResponse.message });
  }
};

/**
 * Add a checkpoint to a roadmap.
 * @route POST /api/roadmaps/:roadmapId/checkpoints
 */
module.exports.addCheckpoint = async (req, res) => {
  try {
    const { roadmapId } = req.params;
    if (!isValidObjectId(roadmapId)) return res.status(400).json({ message: "Invalid roadmap id" });

    const { payload, error } = sanitizeCheckpointPayload(req.body);
    if (error) return res.status(400).json({ message: error });

    const roadmap = await Roadmap.findOne({ _id: roadmapId, userId: req.user._id });
    if (!roadmap) return res.status(404).json({ message: "Roadmap not found" });

    roadmap.checkpoints.push(payload);
    recalculateCompletion(roadmap);
    await roadmap.save();

    const checkpoint = roadmap.checkpoints[roadmap.checkpoints.length - 1];
    res.status(201).json(checkpoint);
  } catch (errorResponse) {
    res.status(500).json({ message: errorResponse.message });
  }
};

/**
 * Update a checkpoint.
 * @route PATCH /api/roadmaps/:roadmapId/checkpoints/:checkpointId
 */
module.exports.updateCheckpoint = async (req, res) => {
  try {
    const { roadmapId, checkpointId } = req.params;
    if (!isValidObjectId(roadmapId) || !isValidObjectId(checkpointId)) {
      return res.status(400).json({ message: "Invalid roadmap or checkpoint id" });
    }

    const { payload, error } = sanitizeCheckpointPayload(req.body, { partial: true });
    if (error) return res.status(400).json({ message: error });

    const roadmap = await Roadmap.findOne({ _id: roadmapId, userId: req.user._id });
    if (!roadmap) return res.status(404).json({ message: "Roadmap not found" });

    const checkpoint = roadmap.checkpoints.id(checkpointId);
    if (!checkpoint) return res.status(404).json({ message: "Checkpoint not found" });

    Object.assign(checkpoint, payload);
    recalculateCompletion(roadmap);
    await roadmap.save();

    res.json(checkpoint);
  } catch (errorResponse) {
    res.status(500).json({ message: errorResponse.message });
  }
};

/**
 * Remove a checkpoint.
 * @route DELETE /api/roadmaps/:roadmapId/checkpoints/:checkpointId
 */
module.exports.deleteCheckpoint = async (req, res) => {
  try {
    const { roadmapId, checkpointId } = req.params;
    if (!isValidObjectId(roadmapId) || !isValidObjectId(checkpointId)) {
      return res.status(400).json({ message: "Invalid roadmap or checkpoint id" });
    }

    const roadmap = await Roadmap.findOne({ _id: roadmapId, userId: req.user._id });
    if (!roadmap) return res.status(404).json({ message: "Roadmap not found" });

    const checkpoint = roadmap.checkpoints.id(checkpointId);
    if (!checkpoint) return res.status(404).json({ message: "Checkpoint not found" });

    checkpoint.deleteOne();
    recalculateCompletion(roadmap);
    await roadmap.save();

    res.status(204).send();
  } catch (errorResponse) {
    res.status(500).json({ message: errorResponse.message });
  }
};

/**
 * Add a milestone to a checkpoint.
 * @route POST /api/roadmaps/:roadmapId/checkpoints/:checkpointId/milestones
 */
module.exports.addMilestone = async (req, res) => {
  try {
    const { roadmapId, checkpointId } = req.params;
    if (!isValidObjectId(roadmapId) || !isValidObjectId(checkpointId)) {
      return res.status(400).json({ message: "Invalid roadmap or checkpoint id" });
    }

    const { payload, error } = sanitizeMilestonePayload(req.body);
    if (error) return res.status(400).json({ message: error });

    const roadmap = await Roadmap.findOne({ _id: roadmapId, userId: req.user._id });
    if (!roadmap) return res.status(404).json({ message: "Roadmap not found" });

    const checkpoint = roadmap.checkpoints.id(checkpointId);
    if (!checkpoint) return res.status(404).json({ message: "Checkpoint not found" });

    checkpoint.milestones.push(payload);
    recalculateCompletion(roadmap);
    await roadmap.save();

    const milestone = checkpoint.milestones[checkpoint.milestones.length - 1];
    res.status(201).json(milestone);
  } catch (errorResponse) {
    res.status(500).json({ message: errorResponse.message });
  }
};

/**
 * Update a milestone in a checkpoint.
 * @route PATCH /api/roadmaps/:roadmapId/checkpoints/:checkpointId/milestones/:milestoneId
 */
module.exports.updateMilestone = async (req, res) => {
  try {
    const { roadmapId, checkpointId, milestoneId } = req.params;
    if (
      !isValidObjectId(roadmapId) ||
      !isValidObjectId(checkpointId) ||
      !isValidObjectId(milestoneId)
    ) {
      return res.status(400).json({ message: "Invalid roadmap/checkpoint/milestone id" });
    }

    const { payload, error } = sanitizeMilestonePayload(req.body, { partial: true });
    if (error) return res.status(400).json({ message: error });

    const roadmap = await Roadmap.findOne({ _id: roadmapId, userId: req.user._id });
    if (!roadmap) return res.status(404).json({ message: "Roadmap not found" });

    const checkpoint = roadmap.checkpoints.id(checkpointId);
    if (!checkpoint) return res.status(404).json({ message: "Checkpoint not found" });

    const milestone = checkpoint.milestones.id(milestoneId);
    if (!milestone) return res.status(404).json({ message: "Milestone not found" });

    Object.assign(milestone, payload);

    if (Object.prototype.hasOwnProperty.call(payload, "isCompleted")) {
      milestone.completedAt = payload.isCompleted ? new Date() : null;
    }

    recalculateCompletion(roadmap);
    await roadmap.save();

    res.json(milestone);
  } catch (errorResponse) {
    res.status(500).json({ message: errorResponse.message });
  }
};

/**
 * Remove a milestone.
 * @route DELETE /api/roadmaps/:roadmapId/checkpoints/:checkpointId/milestones/:milestoneId
 */
module.exports.deleteMilestone = async (req, res) => {
  try {
    const { roadmapId, checkpointId, milestoneId } = req.params;
    if (
      !isValidObjectId(roadmapId) ||
      !isValidObjectId(checkpointId) ||
      !isValidObjectId(milestoneId)
    ) {
      return res.status(400).json({ message: "Invalid roadmap/checkpoint/milestone id" });
    }

    const roadmap = await Roadmap.findOne({ _id: roadmapId, userId: req.user._id });
    if (!roadmap) return res.status(404).json({ message: "Roadmap not found" });

    const checkpoint = roadmap.checkpoints.id(checkpointId);
    if (!checkpoint) return res.status(404).json({ message: "Checkpoint not found" });

    const milestone = checkpoint.milestones.id(milestoneId);
    if (!milestone) return res.status(404).json({ message: "Milestone not found" });

    milestone.deleteOne();
    recalculateCompletion(roadmap);
    await roadmap.save();

    res.status(204).send();
  } catch (errorResponse) {
    res.status(500).json({ message: errorResponse.message });
  }
};

/**
 * Mark a milestone as complete.
 * @route PATCH /api/roadmaps/:roadmapId/checkpoints/:checkpointId/milestones/:milestoneId/complete
 */
module.exports.completeMilestone = async (req, res) => {
  try {
    const { roadmapId, checkpointId, milestoneId } = req.params;
    if (
      !isValidObjectId(roadmapId) ||
      !isValidObjectId(checkpointId) ||
      !isValidObjectId(milestoneId)
    ) {
      return res.status(400).json({ message: "Invalid roadmap/checkpoint/milestone id" });
    }

    const roadmap = await Roadmap.findOne({ _id: roadmapId, userId: req.user._id });
    if (!roadmap) return res.status(404).json({ message: "Roadmap not found" });

    const checkpoint = roadmap.checkpoints.id(checkpointId);
    if (!checkpoint) return res.status(404).json({ message: "Checkpoint not found" });

    const milestone = checkpoint.milestones.id(milestoneId);
    if (!milestone) return res.status(404).json({ message: "Milestone not found" });

    milestone.isCompleted = true;
    milestone.completedAt = new Date();

    recalculateCompletion(roadmap);
    await roadmap.save();

    res.json(roadmapResponse(roadmap));
  } catch (errorResponse) {
    res.status(500).json({ message: errorResponse.message });
  }
};
