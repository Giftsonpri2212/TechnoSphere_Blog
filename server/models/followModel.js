const { Schema, model } = require("mongoose");

const followSchema = new Schema(
  {
    followerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate follows
followSchema.index({ followerId: 1, authorId: 1 }, { unique: true });

module.exports = model("Follow", followSchema);
