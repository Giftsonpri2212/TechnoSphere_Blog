const { Router } = require("express");
const {
  getMyNotifications,
  markNotificationRead,
} = require("../controllers/notificationControllers");
const authMiddleware = require("../middleware/authMiddleware");

const router = Router();

router.get("/", authMiddleware, getMyNotifications);
router.patch("/:id/read", authMiddleware, markNotificationRead);

module.exports = router;
