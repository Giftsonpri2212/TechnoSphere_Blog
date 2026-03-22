import React from "react";
import { Link } from "react-router-dom";
import DOMPurify from "dompurify";
import PostAuthor from "../components/PostAuthor";
import EngagementBar from "../components/EngagementBar";
import { motion } from "framer-motion";

const PostItem = ({
  postID,
  category,
  title,
  desc,
  authorID,
  thumbnail,
  createdAt,
}) => {
  const plainDesc = DOMPurify.sanitize(desc || "", {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
  const shortDesc =
    plainDesc.length > 175 ? `${plainDesc.slice(0, 175)}...` : plainDesc;
  const safeTitle = (title || "Untitled Post").trim();
  const postTitle =
    safeTitle.length > 72 ? `${safeTitle.slice(0, 72)}...` : safeTitle;
  const readingTimeMin = Math.max(1, Math.round(plainDesc.split(/\s+/).length / 220));
  const normalizedCategory = encodeURIComponent(category || "general");

  return (
    <motion.article
      className="post-card"
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      viewport={{ once: true, amount: 0.2 }}
    >
      <div className="post-card__thumbnail">
        <img
          src={`${process.env.REACT_APP_ASSETS_URL}/uploads/${thumbnail}`}
          alt={safeTitle}
        />
      </div>

      <div className="post-card__content">
        <div className="post-card__meta-top">
          <Link to={`/posts/categories/${normalizedCategory}`} className="post-card__topic">
            {category}
          </Link>
          <span>{readingTimeMin} min read</span>
        </div>

        <Link to={`/posts/${postID}`} className="post-card__title-link">
          <h3>{postTitle}</h3>
        </Link>

        <p>{shortDesc}</p>

        <div className="post-card__footer">
          <PostAuthor authorID={authorID} createdAt={createdAt} />
          <div className="post-card__footer-right">
            <EngagementBar
              postId={postID}
              commentLink={`/posts/${postID}#comments`}
            />
          </div>
        </div>
      </div>
    </motion.article>
  );
};

export default PostItem;
