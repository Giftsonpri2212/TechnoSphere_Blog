const { Router } = require("express");
const {
  followAuthor,
  unfollowAuthor,
  getAuthorFollowers,
  checkUserFollows,
} = require("../controllers/followControllers");
const authMiddleware = require("../middleware/authMiddleware");

const router = Router();

router.post("/:authorId", authMiddleware, followAuthor);
router.delete("/:authorId", authMiddleware, unfollowAuthor);
router.get("/:authorId", getAuthorFollowers);
router.get("/:authorId/check", authMiddleware, checkUserFollows);

module.exports = router;
