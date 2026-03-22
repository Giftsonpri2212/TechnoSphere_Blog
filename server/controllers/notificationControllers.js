const Notification = require("../models/notificationModel");
const HttpError = require("../models/errorModel");

const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = notifications.filter((item) => !item.read).length;

    res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    next(new HttpError("Failed to fetch notifications.", 500));
  }
};

const markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return next(new HttpError("Notification not found.", 404));
    }

    res.status(200).json(notification);
  } catch (error) {
    next(new HttpError("Failed to update notification.", 500));
  }
};

module.exports = { getMyNotifications, markNotificationRead };
