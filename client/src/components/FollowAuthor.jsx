import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { UserContext } from "../context/userContext";

const FollowAuthor = ({ authorId }) => {
  const { currentUser, showToast, handleAuthFailure } = useContext(UserContext);
  const token = currentUser?.token;
  const userId = currentUser?.id;
  const [follows, setFollows] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token || !authorId || userId === authorId) return;

    const checkFollows = async () => {
      try {
        const resp = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/follows/${authorId}/check`,
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          },
        );
        setFollows(resp.data?.follows || false);
      } catch (error) {
        if (handleAuthFailure(error)) return;
      }
    };

    checkFollows();
  }, [token, authorId, userId, handleAuthFailure]);

  const handleToggle = async () => {
    if (!token) {
      showToast("Please login to follow authors.", "error");
      return;
    }

    if (userId === authorId) {
      showToast("You cannot follow yourself.", "error");
      return;
    }

    setIsLoading(true);
    try {
      if (follows) {
        await axios.delete(
          `${process.env.REACT_APP_BASE_URL}/follows/${authorId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          },
        );
        setFollows(false);
        showToast("Unfollowed successfully.", "success");
      } else {
        await axios.post(
          `${process.env.REACT_APP_BASE_URL}/follows/${authorId}`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          },
        );
        setFollows(true);
        showToast("Following author now!", "success");
      }
    } catch (error) {
      if (handleAuthFailure(error)) return;
      showToast(
        error.response?.data?.message || "Failed to update follow.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!token || userId === authorId) return null;

  return (
    <button
      type="button"
      className={`btn ${follows ? "" : "primary"}`}
      onClick={handleToggle}
      disabled={isLoading}
    >
      {isLoading ? "Loading..." : follows ? "Following" : "Follow Author"}
    </button>
  );
};

export default FollowAuthor;
