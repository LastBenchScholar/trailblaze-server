const mongoose = require("mongoose");

const milestoneSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    order: {
      type: Number,
      default: 0,
      min: 0,
    },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { _id: true },
);

const checkpointSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    order: {
      type: Number,
      default: 0,
      min: 0,
    },
    isCompleted: { type: Boolean, default: false },
    milestones: {
      type: [milestoneSchema],
      default: [],
    },
  },
  { _id: true },
);

const roadmapSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 5000,
    },
    category: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },
    deadline: Date,
    isCompleted: { type: Boolean, default: false },
    checkpoints: {
      type: [checkpointSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

roadmapSchema.index({ userId: 1, createdAt: -1 });
roadmapSchema.index({ userId: 1, isCompleted: 1 });

module.exports = mongoose.model("Roadmap", roadmapSchema);
