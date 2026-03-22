const Post = require("../models/postModel");
const PostVersion = require("../models/postVersionModel");
const HttpError = require("../models/errorModel");

const getPostVersions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const versions = await PostVersion.find({ postId: id }).sort({ createdAt: -1 });
    res.status(200).json(versions);
  } catch (error) {
    next(new HttpError("Failed to fetch versions.", 500));
  }
};

const rollbackPostVersion = async (req, res, next) => {
  try {
    const { id, versionId } = req.params;

    const post = await Post.findById(id);
    if (!post) return next(new HttpError("Post not found.", 404));
    if (String(post.creator) !== String(req.user.id)) {
      return next(new HttpError("Unauthorized rollback.", 403));
    }

    const version = await PostVersion.findOne({ _id: versionId, postId: id });
    if (!version) return next(new HttpError("Version not found.", 404));

    post.title = version.snapshot.title;
    post.category = version.snapshot.category;
    post.description = version.snapshot.description;
    if (version.snapshot.thumbnail) post.thumbnail = version.snapshot.thumbnail;
    await post.save();

    res.status(200).json(post);
  } catch (error) {
    next(new HttpError("Failed to rollback post version.", 500));
  }
};

module.exports = { getPostVersions, rollbackPostVersion };
