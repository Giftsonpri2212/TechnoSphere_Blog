const Draft = require("../models/draftModel");
const HttpError = require("../models/errorModel");

const autosaveDraft = async (req, res, next) => {
  try {
    const { postId = null, title = "", category = "", description = "" } = req.body;

    const draft = await Draft.findOneAndUpdate(
      { userId: req.user.id, postId },
      { title, category, description },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json(draft);
  } catch (error) {
    next(new HttpError("Failed to autosave draft.", 500));
  }
};

const getDraft = async (req, res, next) => {
  try {
    const { postId = "new" } = req.params;
    const normalizedPostId = postId === "new" ? null : postId;

    const draft = await Draft.findOne({
      userId: req.user.id,
      postId: normalizedPostId,
    });

    res.status(200).json(draft || null);
  } catch (error) {
    next(new HttpError("Failed to fetch draft.", 500));
  }
};

const deleteDraft = async (req, res, next) => {
  try {
    const { postId = "new" } = req.params;
    const normalizedPostId = postId === "new" ? null : postId;

    await Draft.findOneAndDelete({ userId: req.user.id, postId: normalizedPostId });
    res.status(200).json({ message: "Draft deleted." });
  } catch (error) {
    next(new HttpError("Failed to delete draft.", 500));
  }
};

module.exports = { autosaveDraft, getDraft, deleteDraft };
