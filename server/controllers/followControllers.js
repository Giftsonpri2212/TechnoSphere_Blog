const Follow = require("../models/followModel");
const HttpError = require("../models/errorModel");
const User = require("../models/userModel");
const Notification = require("../models/notificationModel");

const followAuthor = async (req, res, next) => {
  try {
    const { authorId } = req.params;
    const followerId = req.user.id;

    if (followerId === authorId) {
      return next(new HttpError("You cannot follow yourself.", 400));
    }

    // Check if already following
    const existing = await Follow.findOne({ followerId, authorId });
    if (existing) {
      return next(new HttpError("You already follow this author.", 400));
    }

    const follow = await Follow.create({ followerId, authorId });
    
    // Create notification for author
    const follower = await User.findById(followerId, "name");
    const notification = await Notification.create({
      userId: authorId,
      type: "follow",
      message: `${follower?.name || "Someone"} started following you.`,
    });
    
    const io = req.app.locals.io;
    if (io) {
      io.to(`user:${authorId}`).emit("notification:new", notification);
    }
    
    res.status(201).json(follow);
  } catch (error) {
    next(new HttpError("Failed to follow author.", 500));
  }
};

const unfollowAuthor = async (req, res, next) => {
  try {
    const { authorId } = req.params;
    const followerId = req.user.id;

    const follow = await Follow.findOneAndDelete({ followerId, authorId });
    if (!follow) {
      return next(new HttpError("Follow not found.", 404));
    }

    res.status(200).json({ message: "Unfollowed successfully." });
  } catch (error) {
    next(new HttpError("Failed to unfollow author.", 500));
  }
};

const getAuthorFollowers = async (req, res, next) => {
  try {
    const { authorId } = req.params;

    const followers = await Follow.find({ authorId }).populate("followerId", "name avatar");
    const followerCount = followers.length;

    res.status(200).json({ followers, followerCount });
  } catch (error) {
    next(new HttpError("Failed to fetch followers.", 500));
  }
};

const checkUserFollows = async (req, res, next) => {
  try {
    const { authorId } = req.params;
    const followerId = req.user?.id;

    if (!followerId) {
      return res.status(200).json({ follows: false });
    }

    const follow = await Follow.findOne({ followerId, authorId });
    res.status(200).json({ follows: !!follow });
  } catch (error) {
    next(new HttpError("Failed to check follow.", 500));
  }
};

module.exports = { followAuthor, unfollowAuthor, getAuthorFollowers, checkUserFollows };
