const mongoose = require("mongoose");
const Roadmap = require("../models/Roadmap");
const { AppError } = require("../utils/utility");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const calculateProgress = (roadmap) => {
  let total = 0;
  let completed = 0;

  roadmap.checkpoints.forEach((checkpoint) => {
    checkpoint.milestones.forEach((milestone) => {
      total += 1;
      if (milestone.isCompleted) completed += 1;
    });
  });

  if (total === 0) return 0;
  return Number(((completed / total) * 100).toFixed(1));
};

const roadmapResponse = (roadmap) => {
  const value = roadmap.toObject();
  value.progress = calculateProgress(roadmap);
  return value;
};

const recalculateCompletion = (roadmap) => {
  roadmap.checkpoints.forEach((checkpoint) => {
    checkpoint.isCompleted =
      checkpoint.milestones.length > 0 &&
      checkpoint.milestones.every((milestone) => milestone.isCompleted);
  });

  roadmap.isCompleted =
    roadmap.checkpoints.length > 0 &&
    roadmap.checkpoints.every((checkpoint) => checkpoint.isCompleted);
};

const sanitizeRoadmapPayload = (body = {}, { partial = false } = {}) => {
  const allowedFields = ["title", "description", "category", "deadline", "checkpoints"];
  const payload = {};

  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = body[field];
    }
  });

  if (!partial && !payload.title) return { error: "Title is required" };

  if (Object.prototype.hasOwnProperty.call(payload, "deadline") && payload.deadline) {
    const date = new Date(payload.deadline);
    if (Number.isNaN(date.getTime())) return { error: "Invalid deadline date" };
    payload.deadline = date;
  }

  return { payload };
};

const sanitizeCheckpointPayload = (body = {}, { partial = false } = {}) => {
  const payload = {};
  if (Object.prototype.hasOwnProperty.call(body, "title")) payload.title = body.title;
  if (Object.prototype.hasOwnProperty.call(body, "order")) payload.order = body.order;
  if (Object.prototype.hasOwnProperty.call(body, "milestones"))
    payload.milestones = body.milestones;

  if (!partial && !payload.title) return { error: "Checkpoint title is required" };
  if (Object.prototype.hasOwnProperty.call(payload, "title") && !payload.title) {
    return { error: "Checkpoint title cannot be empty" };
  }

  return { payload };
};

const sanitizeMilestonePayload = (body = {}, { partial = false } = {}) => {
  const payload = {};
  if (Object.prototype.hasOwnProperty.call(body, "title")) payload.title = body.title;
  if (Object.prototype.hasOwnProperty.call(body, "order")) payload.order = body.order;
  if (Object.prototype.hasOwnProperty.call(body, "isCompleted"))
    payload.isCompleted = body.isCompleted;

  if (!partial && !payload.title) return { error: "Milestone title is required" };
  if (Object.prototype.hasOwnProperty.call(payload, "title") && !payload.title) {
    return { error: "Milestone title cannot be empty" };
  }

  return { payload };
};

/**
 * List user roadmaps with pagination.
 * @route /api/roadmaps
 * @query page, limit, isCompleted, category
 * @method GET
 */
exports.getRoadmaps = async (req, res) => {
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
exports.getRoadmap = async (req, res) => {
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
exports.createRoadmap = async (req, res) => {
  try {
    const { payload, error } = sanitizeRoadmapPayload(req.body);
    if (error) return res.status(400).json({ message: error });

    const roadmap = await Roadmap.create({
      ...payload,
      userId: req.user._id,
    });

    recalculateCompletion(roadmap);
    await roadmap.save();

    res.status(201).json(roadmapResponse(roadmap));
  } catch (errorResponse) {
    res.status(500).json({ message: errorResponse.message });
  }
};

/**
 * Update roadmap metadata and nested checkpoints.
 * @route PATCH /api/roadmaps/:id
 */
exports.updateRoadmap = async (req, res) => {
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
exports.deleteRoadmap = async (req, res) => {
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
exports.addCheckpoint = async (req, res) => {
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
exports.updateCheckpoint = async (req, res) => {
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
exports.deleteCheckpoint = async (req, res) => {
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
exports.addMilestone = async (req, res) => {
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
exports.updateMilestone = async (req, res) => {
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
exports.deleteMilestone = async (req, res) => {
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
exports.completeMilestone = async (req, res) => {
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
