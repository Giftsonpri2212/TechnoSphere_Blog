import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { UserContext } from "../context/userContext";

const socketBaseUrl =
  process.env.REACT_APP_ASSETS_URL ||
  (process.env.REACT_APP_BASE_URL || "").replace(/\/api\/?$/, "");

const LiveComments = ({ postId }) => {
  const { currentUser, showToast, handleAuthFailure } = useContext(UserContext);
  const token = currentUser?.token;
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState("");

  const appendUniqueComment = (existingComments, incomingComment) => {
    if (!incomingComment?._id) return existingComments;
    const exists = existingComments.some(
      (comment) => String(comment._id) === String(incomingComment._id),
    );
    return exists ? existingComments : [...existingComments, incomingComment];
  };

  useEffect(() => {
    if (!postId) return;

    const loadComments = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/comments/${postId}`,
        );
        setComments(response.data || []);
      } catch (error) {
        setComments([]);
      }
    };

    loadComments();
  }, [postId]);

  useEffect(() => {
    if (!postId) return;

    const socket = io(socketBaseUrl, { autoConnect: false });
    socket.connect();
    socket.emit("join-post", postId);
    socket.on("comment:new", (newComment) => {
      if (String(newComment.postId) === String(postId)) {
        setComments((prev) => appendUniqueComment(prev, newComment));
      }
    });

    return () => {
      socket.off("comment:new");
      if (socket.connected || socket.active) {
        socket.disconnect();
      }
    };
  }, [postId]);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      showToast("Please login to comment.", "error");
      return;
    }

    if (!commentInput.trim()) return;

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BASE_URL}/comments/${postId}`,
        { content: commentInput.trim() },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        },
      );
      setComments((prev) => appendUniqueComment(prev, response.data));
      setCommentInput("");
    } catch (error) {
      if (handleAuthFailure(error)) return;
      showToast(
        error.response?.data?.message || "Failed to add comment.",
        "error",
      );
    }
  };

  return (
    <section className="live-comments" id="comments">
      <h3>Live Comments</h3>
      <form className="live-comments__form" onSubmit={handleCommentSubmit}>
        <input
          type="text"
          placeholder="Write a comment..."
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
        />
        <button type="submit" className="btn primary">
          Send
        </button>
      </form>

      <div className="live-comments__list">
        {comments.length ? (
          comments.map((comment) => (
            <article key={comment._id} className="live-comments__item">
              <div className="live-comments__item-head">
                <div className="live-comments__avatar">
                  {(comment.userName || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h5>{comment.userName || "User"}</h5>
                  <small>
                    {comment.createdAt
                      ? new Date(comment.createdAt).toLocaleString("en-IN")
                      : "Just now"}
                  </small>
                </div>
              </div>
              <p>{comment.content}</p>
            </article>
          ))
        ) : (
          <p className="center">No comments yet.</p>
        )}
      </div>
    </section>
  );
};

export default LiveComments;
