const { Router } = require("express");
const {
  createPost,
  getPost,
  getPosts,
  searchPosts,
  getRecommendedPosts,
  editPost,
  getUserPosts,
  getPostbyCategory,
  deletePost,
  generateAIDraft,
  summarizePostContent,
} = require("../controllers/postControllers");
const {
  getPostVersions,
  rollbackPostVersion,
} = require("../controllers/versionControllers");
const rateLimit = require("express-rate-limit");
const authMiddleware = require("../middleware/authMiddleware");
const router = Router();

const summarizeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many summarize requests. Please try again in a few minutes.",
  },
});

router.post("/", authMiddleware, createPost);
router.post("/ai/draft", authMiddleware, generateAIDraft);
router.post("/ai/summarize", summarizeLimiter, summarizePostContent);
router.get("/search", searchPosts);
router.get("/", getPosts);
router.get("/users/:id", getUserPosts);
router.get("/:categories/:category", getPostbyCategory);
router.get("/:id/recommendations", getRecommendedPosts);
router.get("/:id/versions", authMiddleware, getPostVersions);
router.post("/:id/rollback/:versionId", authMiddleware, rollbackPostVersion);
router.get("/:id", getPost);
router.patch("/:id", authMiddleware, editPost);
router.delete("/:id", authMiddleware, deletePost);

module.exports = router;
