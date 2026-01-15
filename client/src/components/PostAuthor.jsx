import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import ReactTimeAgo from "react-time-ago";
import TimeAgo from "javascript-time-ago";

import en from "javascript-time-ago/locale/en.json";

TimeAgo.addDefaultLocale(en);

const PostAuthor = ({ authorID, createdAt }) => {
  const [author, setAuthor] = useState(null);

  useEffect(() => {
    const getAuthor = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/users/${authorID}`
        );

        console.log("Author API response:", response.data);
        setAuthor(response.data.user || response.data);
      } catch (error) {
        console.error("Error fetching author:", error);
      }
    };
    if (authorID) getAuthor();
  }, [authorID]);

  // ✅ Memoize and validate date
  const createdDate = useMemo(() => {
    const d = new Date(createdAt);
    return isNaN(d) ? null : d;
  }, [createdAt]);

  return (
    <Link to={`/posts/users/${authorID}`} className="post__author">
      <div className="post__author-avatar">
        <img
          src={
            author?.avatar
              ? `${process.env.REACT_APP_ASSETS_URL}/uploads/${author.avatar}`
              : "/default-avatar.png"
          }
          alt={author?.name || "Author Avatar"}
          onError={(e) => (e.currentTarget.src = "/default-avatar.png")}
        />
      </div>
      <div className="post__author-details">
        <h5>By: {author?.name || "Unknown Author"}</h5>

        {/* ✅ Show only relative time (e.g. "3 days ago") */}
        <small>
          {createdDate ? (
            <ReactTimeAgo date={createdDate} locale="en" />
          ) : (
            "Unknown time"
          )}
        </small>
        <br />

        {/* ❌ Commented out exact IST time */}
        {/*
        <small>
          {createdDate
            ? createdDate.toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                dateStyle: "medium",
                timeStyle: "short",
              })
            : "N/A"}
        </small>
        */}
      </div>
    </Link>
  );
};

export default PostAuthor;
