const Like = require("../models/likeModel");
const HttpError = require("../models/errorModel");
const Post = require("../models/postModel");
const User = require("../models/userModel");
const Notification = require("../models/notificationModel");

const likePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    // Check if already liked
    const existing = await Like.findOne({ userId, postId });
    if (existing) {
      return next(new HttpError("You already liked this post.", 400));
    }

    const like = await Like.create({ userId, postId });
    
    // Create notification for post author
    const post = await Post.findById(postId).populate("creator", "name");
    if (post && post.creator && String(post.creator._id) !== String(userId)) {
      const currentUser = await User.findById(userId, "name");
      const notification = await Notification.create({
        userId: post.creator._id,
        postId,
        type: "like",
        message: `${currentUser?.name || "Someone"} liked your post.`,
      });
      
      const io = req.app.locals.io;
      if (io) {
        io.to(`user:${post.creator._id}`).emit("notification:new", notification);
      }
    }
    
    res.status(201).json(like);
  } catch (error) {
    next(new HttpError("Failed to like post.", 500));
  }
};

const unlikePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const like = await Like.findOneAndDelete({ userId, postId });
    if (!like) {
      return next(new HttpError("Like not found.", 404));
    }

    res.status(200).json({ message: "Like removed." });
  } catch (error) {
    next(new HttpError("Failed to unlike post.", 500));
  }
};

const getPostLikes = async (req, res, next) => {
  try {
    const { postId } = req.params;

    const likes = await Like.find({ postId }).populate("userId", "name avatar");
    const likeCount = likes.length;

    res.status(200).json({ likes, likeCount });
  } catch (error) {
    next(new HttpError("Failed to fetch likes.", 500));
  }
};

const checkUserLiked = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(200).json({ liked: false });
    }

    const like = await Like.findOne({ userId, postId });
    res.status(200).json({ liked: !!like });
  } catch (error) {
    next(new HttpError("Failed to check like.", 500));
  }
};

module.exports = { likePost, unlikePost, getPostLikes, checkUserLiked };
