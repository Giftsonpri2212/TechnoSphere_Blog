import React, { useState, useEffect, useMemo } from "react";
import axios from "axios"; // Ensure axios is imported
import PostItem from "../components/PostItem";
import ListSkeleton from "./ListSkeleton";
import EmptyStateCard from "./EmptyStateCard";
import { useSearchParams } from "react-router-dom";

const Posts = () => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const urlQuery = (searchParams.get("q") || "").trim();
    setQuery(urlQuery);
  }, [searchParams]);

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/posts`,
        );
        setPosts(response.data);
      } catch (err) {
        console.log(err);
      }
      setIsLoading(false);
    };
    fetchPosts();
  }, []);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!query.trim()) return;
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/posts/search?q=${encodeURIComponent(query.trim())}`,
        );
        setPosts(response.data || []);
      } catch (error) {
        // Keep existing posts list when search endpoint fails.
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [query]);

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return posts;

    return posts.filter((post) => {
      const title = (post.title || "").toLowerCase();
      const category = (post.category || "").toLowerCase();
      const description = (post.description || "").toLowerCase();

      return (
        title.includes(normalizedQuery) ||
        category.includes(normalizedQuery) ||
        description.includes(normalizedQuery)
      );
    });
  }, [posts, query]);

  if (isLoading) {
    return <ListSkeleton count={6} />;
  }

  return (
    <section className="feed">
      <div className="feed__heading">
        <div>
          <p className="feed__kicker">Latest Articles</p>
          <h2>Fresh ideas from the engineering community</h2>
        </div>
        {query ? <p className="feed__query-tag">Results for: {query}</p> : null}
      </div>

      {filteredPosts.length > 0 ? (
        <div className="feed__grid">
          {filteredPosts.map((post) => (
            <PostItem
              key={post._id}
              postID={post._id}
              thumbnail={post.thumbnail}
              category={post.category}
              title={post.title}
              desc={post.description}
              authorID={post.creator}
              createdAt={post.createdAt}
            />
          ))}
        </div>
      ) : (
        <EmptyStateCard
          title={query ? "No posts match your search" : "No posts found"}
          subtitle={
            query
              ? "Try another keyword in the top search bar."
              : "Be the first to publish a post in this space."
          }
        />
      )}
    </section>
  );
};

export default Posts;
