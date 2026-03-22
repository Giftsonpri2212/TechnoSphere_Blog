const { Router } = require("express");
const { getPostComments, createComment } = require("../controllers/commentControllers");
const authMiddleware = require("../middleware/authMiddleware");

const router = Router();

router.get("/:postId", getPostComments);
router.post("/:postId", authMiddleware, createComment);

module.exports = router;
