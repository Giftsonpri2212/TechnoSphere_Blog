const { Schema, model } = require("mongoose");

const likeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate likes
likeSchema.index({ userId: 1, postId: 1 }, { unique: true });

module.exports = model("Like", likeSchema);
