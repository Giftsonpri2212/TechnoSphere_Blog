const { Schema, model } = require("mongoose");

const postSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: [
        "Programming",
        "DSA",
        "Competetive Programming",
        "Web Development",
        "Mobile App Development",
        "Data Science",
        "Machine Learning",
        "Devops",
        "Cloud Computing",
        "Cybersecurity",
        "Interview Preparation",
        "Tech Trends",
        "Opportunities in Tech",
      ],
      message: "Value is not supported",
    },
    description: { type: String, required: true },
    creator: { type: Schema.Types.ObjectId, ref: "User" },
    thumbnail: { type: String, required: true },
    embedding: { type: [Number], default: [] },
  },
  { timestamps: true }
);

postSchema.index({ title: "text", description: "text", category: "text" });

module.exports = model("Post", postSchema);
