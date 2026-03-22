const Comment = require("../models/commentModel");
const Post = require("../models/postModel");
const Notification = require("../models/notificationModel");
const HttpError = require("../models/errorModel");

const getPostComments = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const comments = await Comment.find({ postId }).sort({ createdAt: 1 });
    res.status(200).json(comments);
  } catch (error) {
    next(new HttpError("Failed to fetch comments.", 500));
  }
};

const createComment = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return next(new HttpError("Comment content is required.", 422));
    }

    const post = await Post.findById(postId);
    if (!post) return next(new HttpError("Post not found.", 404));

    const comment = await Comment.create({
      postId,
      userId: req.user.id,
      userName: req.user.name || "Anonymous",
      content: content.trim(),
    });

    if (String(post.creator) !== String(req.user.id)) {
      const notification = await Notification.create({
        userId: post.creator,
        postId: post._id,
        type: "comment",
        message: `${req.user.name || "Someone"} commented on your post`,
      });

      const io = req.app.locals.io;
      if (io) {
        io.to(`user:${post.creator}`).emit("notification:new", notification);
      }
    }

    const io = req.app.locals.io;
    if (io) {
      io.to(`post:${postId}`).emit("comment:new", comment);
    }

    res.status(201).json(comment);
  } catch (error) {
    next(new HttpError("Failed to create comment.", 500));
  }
};

module.exports = { getPostComments, createComment };
