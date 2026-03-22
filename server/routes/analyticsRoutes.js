const { Router } = require("express");
const {
  trackPostAnalytics,
  getPostAnalytics,
  getDashboardAnalytics,
} = require("../controllers/analyticsControllers");
const authMiddleware = require("../middleware/authMiddleware");

const router = Router();

router.post("/posts/:postId", trackPostAnalytics);
router.get("/posts/:postId", getPostAnalytics);
router.get("/dashboard", authMiddleware, getDashboardAnalytics);

module.exports = router;
