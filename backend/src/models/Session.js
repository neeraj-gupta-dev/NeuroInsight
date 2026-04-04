// backend/src/models/Session.js
const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
    cognitiveState: {
      type:     String,
      required: true,
      enum:     ["Focused", "Relaxed", "Stressed", "Distracted", "Drowsy"],
    },
    confidence: {
      type: Number,
      min:  0,
      max:  1,
    },
    epochId: {
      type: Number,
    },
    subject: {
      type: Number,
    },
    features: {
      type: Map,
      of:   Number,
    },
    shapValues: {
      type: Map,
      of:   Number,
    },
    allProbabilities: {
      type: Map,
      of:   Number,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index for efficient user-ordered queries
sessionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Session", sessionSchema);
