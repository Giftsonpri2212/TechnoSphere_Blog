const { Router } = require("express");
const {
  likePost,
  unlikePost,
  getPostLikes,
  checkUserLiked,
} = require("../controllers/likeControllers");
const authMiddleware = require("../middleware/authMiddleware");

const router = Router();

router.post("/:postId", authMiddleware, likePost);
router.delete("/:postId", authMiddleware, unlikePost);
router.get("/:postId", getPostLikes);
router.get("/:postId/check", authMiddleware, checkUserLiked);

module.exports = router;
