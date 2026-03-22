import React, { useEffect, useContext, useState } from "react";
import PostAuthor from "../components/PostAuthor";
import { Link, useParams } from "react-router-dom";
import DOMPurify from "dompurify";
import Loader from "./Loader";
import DeletePosts from "./DeletePosts";
import { UserContext } from "../context/userContext";
import axios from "axios";
import RecommendationsPanel from "../components/RecommendationsPanel";
import LiveComments from "../components/LiveComments";
import FollowAuthor from "../components/FollowAuthor";
import EngagementBar from "../components/EngagementBar";

const PostDetail = () => {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [summaryMeta, setSummaryMeta] = useState(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const { currentUser, showToast } = useContext(UserContext);

  const estimateReadingTime = (htmlContent) => {
    if (!htmlContent) return 1;
    const plainText = htmlContent.replace(/<[^>]*>/g, " ");
    const words = plainText.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 220));
  };

  useEffect(() => {
    const getPost = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/posts/${id}`,
        );
        setPost(response.data);
      } catch (error) {
        setError(error);
      }
      setIsLoading(false);
    };

    getPost();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    axios
      .post(`${process.env.REACT_APP_BASE_URL}/analytics/posts/${id}`, {
        eventType: "view",
      })
      .catch(() => undefined);
  }, [id]);

  const summarizePost = async () => {
    if (!post?.description) {
      showToast("No content to summarize.", "error");
      return;
    }

    setIsSummarizing(true);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BASE_URL}/posts/ai/summarize`,
        { content: post.description },
      );
      setSummary(response.data?.summary || "");
      setSummaryMeta({
        aiSource: response.data?.aiSource || "unknown",
        cached: Boolean(response.data?.cached),
      });
      showToast("Summarization complete!", "success");
    } catch (err) {
      showToast(
        err.response?.data?.message || "Summarization failed.",
        "error",
      );
    } finally {
      setIsSummarizing(false);
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  const readingTime = estimateReadingTime(post?.description);
  const publishedDate = post?.createdAt
    ? new Date(post.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <section className="post-detail">
      {error && <p className="error">{error} </p>}
      {post && (
        <div className="container post-detail__container">
          <div className="post-detail__grid">
            <article className="post-detail__main">
              <div className="post-detail__header">
                <PostAuthor authorID={post.creator} createdAt={post.createdAt} />

                <div className="post-detail__header-actions">
                  <FollowAuthor authorId={post.creator} />
                  {currentUser?.id === post?.creator && (
                    <div className="post-detail__button">
                      <Link
                        to={`/posts/${post?._id}/edit`}
                        className="btn sm primary"
                      >
                        Edit
                      </Link>
                      <DeletePosts postId={id} />
                    </div>
                  )}
                </div>
            </div>

              <div className="post-detail__meta-row">
                <span className="post-detail__category-chip">{post.category}</span>
                <span>{readingTime} min read</span>
                <span>{publishedDate}</span>
              </div>

              <h1>{post.title}</h1>

              <EngagementBar postId={post._id} />

              <div className="post-detail__thumbnail">
                <img
                  src={`${process.env.REACT_APP_ASSETS_URL}/uploads/${post.thumbnail}`}
                  alt="Post Thumbnail"
                />
              </div>

              <div
                className="post-detail__content"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(post.description),
                }}
              />

              <LiveComments postId={post._id} />
            </article>

            <aside className="post-detail__aside">
              <div className="post-detail__summary-tools">
                <h4>AI Companion</h4>
                <p>Need a quick brief before reading? Generate a focused summary.</p>
                <button
                  type="button"
                  className="btn"
                  onClick={summarizePost}
                  disabled={isSummarizing}
                >
                  {isSummarizing ? "Summarizing..." : "Summarize with AI"}
                </button>
              </div>

              {summary ? (
                <div className="post-detail__summary">
                  <div className="post-detail__summary-header">
                    <h3>AI Summary</h3>
                    <small>
                      Source: {summaryMeta?.aiSource || "unknown"}
                      {summaryMeta?.cached ? " | Cached" : ""}
                    </small>
                  </div>
                  <p>{summary}</p>
                </div>
              ) : null}

              <RecommendationsPanel postId={post._id} />
            </aside>
          </div>
        </div>
      )}
    </section>
  );
};

export default PostDetail;
