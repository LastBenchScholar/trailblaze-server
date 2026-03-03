const mongoose = require("mongoose");

const milestoneSchema = new mongoose.Schema({
  title: String,
  order: Number,
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
});

const checkpointSchema = new mongoose.Schema({
  title: String,
  order: Number,
  isCompleted: { type: Boolean, default: false },
  milestones: [milestoneSchema],
});

const roadmapSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: String,
    description: String,
    category: String,
    deadline: Date,
    isCompleted: { type: Boolean, default: false },
    checkpoints: [checkpointSchema],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Roadmap", roadmapSchema);
