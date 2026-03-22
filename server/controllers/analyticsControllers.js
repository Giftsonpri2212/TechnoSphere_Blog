const Analytics = require("../models/analyticsModel");
const Post = require("../models/postModel");
const HttpError = require("../models/errorModel");

const trackPostAnalytics = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { readTimeSec = 0, eventType = "view" } = req.body;

    await Analytics.create({
      postId,
      userId: req.user?.id,
      readTimeSec: Number(readTimeSec) || 0,
      eventType,
    });

    res.status(201).json({ message: "Analytics tracked." });
  } catch (error) {
    next(new HttpError("Failed to track analytics.", 500));
  }
};

const getPostAnalytics = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const events = await Analytics.find({ postId });

    const views = events.filter((e) => e.eventType === "view").length;
    const readTimeTotal = events.reduce((sum, e) => sum + (e.readTimeSec || 0), 0);

    res.status(200).json({
      postId,
      views,
      readTimeTotal,
      avgReadTime: views ? Math.round(readTimeTotal / views) : 0,
    });
  } catch (error) {
    next(new HttpError("Failed to fetch post analytics.", 500));
  }
};

const getDashboardAnalytics = async (req, res, next) => {
  try {
    const myPosts = await Post.find({ creator: req.user.id }).select("_id title");
    const postIds = myPosts.map((p) => p._id);

    const events = await Analytics.find({ postId: { $in: postIds } });

    const byPost = myPosts.map((post) => {
      const records = events.filter(
        (e) => String(e.postId) === String(post._id)
      );
      const views = records.filter((r) => r.eventType === "view").length;
      const readTimeTotal = records.reduce((sum, r) => sum + (r.readTimeSec || 0), 0);
      return {
        postId: post._id,
        title: post.title,
        views,
        readTimeTotal,
      };
    });

    const totalViews = byPost.reduce((sum, p) => sum + p.views, 0);
    const totalReadTime = byPost.reduce((sum, p) => sum + p.readTimeTotal, 0);

    res.status(200).json({ totalViews, totalReadTime, posts: byPost });
  } catch (error) {
    next(new HttpError("Failed to fetch dashboard analytics.", 500));
  }
};

module.exports = {
  trackPostAnalytics,
  getPostAnalytics,
  getDashboardAnalytics,
};
