import React, { useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { UserContext } from "../context/userContext";
import { Link } from "react-router-dom";
import { IoNotificationsOutline } from "react-icons/io5";

const socketBaseUrl =
  process.env.REACT_APP_ASSETS_URL ||
  (process.env.REACT_APP_BASE_URL || "").replace(/\/api\/?$/, "");

const NotificationBell = () => {
  const { currentUser, handleAuthFailure } = useContext(UserContext);
  const token = currentUser?.token;
  const userId = currentUser?.id;
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || !token) return;

    const fetchNotifications = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/notifications`,
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          },
        );
        setUnreadCount(response.data?.unreadCount || 0);
      } catch (error) {
        if (handleAuthFailure(error)) return;
        setUnreadCount(0);
      }
    };

    fetchNotifications();
  }, [userId, token, handleAuthFailure]);

  useEffect(() => {
    if (!userId) return;

    const socket = io(socketBaseUrl, { autoConnect: false });
    socket.connect();
    socket.emit("join-user", userId);
    socket.on("notification:new", () => {
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      socket.off("notification:new");
      if (socket.connected || socket.active) {
        socket.disconnect();
      }
    };
  }, [userId]);

  useEffect(() => {
    const handleUnreadCountSync = (event) => {
      const nextCount = Number(event.detail?.count);
      if (Number.isFinite(nextCount) && nextCount >= 0) {
        setUnreadCount(nextCount);
      }
    };

    window.addEventListener(
      "notifications:unread-count",
      handleUnreadCountSync,
    );
    return () => {
      window.removeEventListener(
        "notifications:unread-count",
        handleUnreadCountSync,
      );
    };
  }, []);

  if (!userId) return null;

  return (
    <Link
      to="/notifications"
      className="notification-bell"
      title="View notifications"
      aria-label="Open notifications"
    >
      <IoNotificationsOutline aria-hidden="true" />
      {unreadCount > 0 ? (
        <span className="notification-badge">{unreadCount}</span>
      ) : null}
    </Link>
  );
};

export default NotificationBell;
