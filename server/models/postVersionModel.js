const { Schema, model } = require("mongoose");

const postVersionSchema = new Schema(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    editedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    snapshot: {
      title: String,
      category: String,
      description: String,
      thumbnail: String,
    },
    version: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = model("PostVersion", postVersionSchema);
