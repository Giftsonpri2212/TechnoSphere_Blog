const { Router } = require("express");
const router = Router();
const {
  registerUser,
  loginUser,
  getUser,
  changeAvatar,
  editUser,
  getAuthors,
  refreshAccessToken,
  logoutUser,
} = require("../controllers/userControllers");
const authMiddleware = require("../middleware/authMiddleware");


router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh", refreshAccessToken);
router.get("/:id", getUser);
router.get("/", getAuthors);
router.post("/change-avatar", authMiddleware, changeAvatar);
router.patch("/edit-user", authMiddleware, editUser);
router.post("/logout", authMiddleware, logoutUser);

module.exports = router;
