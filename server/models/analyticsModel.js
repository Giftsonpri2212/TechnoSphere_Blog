const { Schema, model } = require("mongoose");

const analyticsSchema = new Schema(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    readTimeSec: { type: Number, default: 0 },
    eventType: { type: String, enum: ["view", "engagement"], default: "view" },
  },
  { timestamps: true }
);

module.exports = model("Analytics", analyticsSchema);
