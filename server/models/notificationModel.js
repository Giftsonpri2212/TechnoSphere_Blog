const { Schema, model } = require("mongoose");

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    postId: { type: Schema.Types.ObjectId, ref: "Post" },
    type: { type: String, enum: ["comment", "like", "follow", "system"], default: "comment" },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = model("Notification", notificationSchema);
