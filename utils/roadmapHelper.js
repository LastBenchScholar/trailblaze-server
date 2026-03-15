const mongoose = require("mongoose");

/**
 * Helper function to check if the `id` is valid mongoDB Object Id
 * @param {string} id - The ID to validate
 * @returns {boolean} - True if valid ObjectId, false otherwise
 */
module.exports.isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Helper function to calculate roadmap progress based on completed milestones
 * @param {Object} roadmap - The roadmap object
 * @returns {number} - The progress percentage
 */
module.exports.calculateProgress = (roadmap) => {
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

/**
 * Helper function to generate a roadmap response with calculated progress
 * @param {Object} roadmap - The roadmap object
 * @returns {Object} - Updated object with calculated progress attribute value
 */
module.exports.roadmapResponse = (roadmap) => {
  const value = roadmap.toObject();
  value.progress = module.exports.calculateProgress(roadmap);
  return value;
};

/**
 * Helper function to recalculate the completion status of a roadmap and its checkpoints
 * @param {Object} roadmap - The roadmap object
 * @returns {void} - Modifies the roadmap object in-place to update completion status
 */
module.exports.recalculateCompletion = (roadmap) => {
  roadmap.checkpoints.forEach((checkpoint) => {
    checkpoint.isCompleted =
      checkpoint.milestones.length > 0 &&
      checkpoint.milestones.every((milestone) => milestone.isCompleted);
  });

  roadmap.isCompleted =
    roadmap.checkpoints.length > 0 &&
    roadmap.checkpoints.every((checkpoint) => checkpoint.isCompleted);
};

/**
 * Helper function to sanitize roadmap payload
 * @param {Object} body - The payload to sanitize
 * @param {Object} options - Options for sanitization
 * @param {boolean} options.partial - Whether to allow partial updates
 * @returns {Object} - The sanitized payload or an error object
 */
module.exports.sanitizeRoadmapPayload = (body = {}, { partial = false } = {}) => {
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

/**
 * Helper function to sanitize checkpoint payload
 * @param {Object} body - The payload to sanitize
 * @param {Object} options - Options for sanitization
 * @param {boolean} options.partial - Whether to allow partial updates
 * @returns {Object} - The sanitized payload or an error object
 */
module.exports.sanitizeCheckpointPayload = (body = {}, { partial = false } = {}) => {
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

/**
 * Helper function to sanitize milestone payload
 * @param {Object} body - The payload to sanitize
 * @param {Object} options - Options for sanitization
 * @param {boolean} options.partial - Whether to allow partial updates
 * @returns {Object} - The sanitized payload or an error object
 */
module.exports.sanitizeMilestonePayload = (body = {}, { partial = false } = {}) => {
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
