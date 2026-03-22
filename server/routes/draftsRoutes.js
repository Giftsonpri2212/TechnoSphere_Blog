const { Router } = require("express");
const { autosaveDraft, getDraft, deleteDraft } = require("../controllers/draftControllers");
const authMiddleware = require("../middleware/authMiddleware");

const router = Router();

router.post("/autosave", authMiddleware, autosaveDraft);
router.get("/:postId", authMiddleware, getDraft);
router.delete("/:postId", authMiddleware, deleteDraft);

module.exports = router;
