const { Schema, model } = require("mongoose");

const draftSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    postId: { type: Schema.Types.ObjectId, ref: "Post", default: null },
    title: { type: String, default: "" },
    category: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

draftSchema.index({ userId: 1, postId: 1 }, { unique: true });

module.exports = model("Draft", draftSchema);
