import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { UserContext } from "../context/userContext";
import { AiOutlineHeart, AiFillHeart, AiOutlineComment } from "react-icons/ai";

const EngagementBar = ({ postId, commentLink = null }) => {
  const { currentUser, handleAuthFailure, showToast } = useContext(UserContext);
  const token = currentUser?.token;
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (!postId) return;

    const fetchEngagement = async () => {
      try {
        const likesResp = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/likes/${postId}`,
        );
        setLikeCount(likesResp.data?.likeCount || 0);

        const commentsResp = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/comments/${postId}`,
        );
        setCommentCount((commentsResp.data || []).length);
      } catch (error) {
        // Silent fail
      }
    };

    fetchEngagement();
  }, [postId]);

  useEffect(() => {
    if (!token || !postId) return;

    const checkLiked = async () => {
      try {
        const resp = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/likes/${postId}/check`,
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          },
        );
        setLiked(resp.data?.liked || false);
      } catch (error) {
        if (handleAuthFailure(error)) return;
      }
    };

    checkLiked();
  }, [token, postId, handleAuthFailure]);

  const handleLike = async () => {
    if (!token) {
      alert("Please login to like posts.");
      return;
    }

    try {
      if (liked) {
        await axios.delete(
          `${process.env.REACT_APP_BASE_URL}/likes/${postId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          },
        );
        setLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
      } else {
        await axios.post(
          `${process.env.REACT_APP_BASE_URL}/likes/${postId}`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          },
        );
        setLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    } catch (error) {
      if (handleAuthFailure(error)) return;
      showToast(
        error?.response?.data?.message || "Unable to update like.",
        "error",
      );
    }
  };

  return (
    <div className="engagement-bar">
      <button
        type="button"
        className={`engagement-bar__btn ${liked ? "is-active" : ""}`}
        onClick={handleLike}
        title={liked ? "Unlike" : "Like"}
      >
        {liked ? <AiFillHeart /> : <AiOutlineHeart />}
        <span>{likeCount}</span>
      </button>
      {commentLink ? (
        <Link
          to={commentLink}
          className="engagement-bar__stat"
          title="Open comments"
          aria-label="Open comments"
        >
          <AiOutlineComment />
          <span>{commentCount}</span>
        </Link>
      ) : (
        <div className="engagement-bar__stat">
          <AiOutlineComment />
          <span>{commentCount}</span>
        </div>
      )}
    </div>
  );
};

export default EngagementBar;
