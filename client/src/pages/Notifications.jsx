import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { UserContext } from "../context/userContext";
import Loader from "./Loader";
import EmptyStateCard from "../components/EmptyStateCard";

const Notifications = () => {
  const { currentUser, showToast, handleAuthFailure } = useContext(UserContext);
  const token = currentUser?.token;
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const syncUnreadCount = (count) => {
    window.dispatchEvent(
      new CustomEvent("notifications:unread-count", {
        detail: { count },
      }),
    );
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchNotifications = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/notifications`,
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          },
        );
        const list = response.data?.notifications || [];
        setNotifications(list);
        const unread =
          response.data?.unreadCount ??
          list.filter((item) => item && item.read === false).length;
        syncUnreadCount(unread);
      } catch (error) {
        if (handleAuthFailure(error)) {
          navigate("/login");
          return;
        }
        showToast("Unable to load notifications.", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, [token, navigate, showToast, handleAuthFailure]);

  const markAsRead = async (notificationId) => {
    if (!token) return;

    try {
      await axios.patch(
        `${process.env.REACT_APP_BASE_URL}/notifications/${notificationId}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        },
      );

      setNotifications((prev) => {
        const next = prev.map((item) =>
          item._id === notificationId ? { ...item, read: true } : item,
        );
        const unread = next.filter(
          (item) => item && item.read === false,
        ).length;
        syncUnreadCount(unread);
        return next;
      });
    } catch (error) {
      if (handleAuthFailure(error)) {
        navigate("/login");
        return;
      }
      showToast("Failed to mark notification as read.", "error");
    }
  };

  if (isLoading) return <Loader />;

  const unreadCount = notifications.filter((item) => item.read === false).length;

  return (
    <section className="notifications-page">
      <div className="container notifications-page__container">
        <div className="notifications-page__header">
          <div>
            <h2>Notifications</h2>
            <p className="notifications-page__subtitle">
              Stay on top of comments, follows, and interactions.
            </p>
          </div>
          <div className="notifications-page__stats">
            <span>
              Total <strong>{notifications.length}</strong>
            </span>
            <span>
              Unread <strong>{unreadCount}</strong>
            </span>
          </div>
          {currentUser?.id ? (
            <Link to={`/myposts/${currentUser.id}`} className="btn sm">
              Go to Dashboard
            </Link>
          ) : null}
        </div>

        {!notifications.length ? (
          <EmptyStateCard
            title="No notifications yet"
            subtitle="When someone comments or interacts, updates will appear here."
          />
        ) : (
          <div className="notifications-page__list">
            {notifications.map((item) => (
              <article
                key={item._id}
                className={`notifications-page__item ${item.read ? "" : "is-unread"}`}
              >
                <div className="notifications-page__body">
                  <p>{item.message}</p>
                  <small>
                    {new Date(item.createdAt).toLocaleString("en-IN")}
                  </small>
                </div>

                <div className="notifications-page__actions">
                  {item.postId ? (
                    <Link
                      to={`/posts/${item.postId}`}
                      className="btn sm primary"
                    >
                      Open Post
                    </Link>
                  ) : null}
                  {!item.read ? (
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => markAsRead(item._id)}
                    >
                      Mark Read
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Notifications;
