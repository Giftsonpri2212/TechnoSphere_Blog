import React, { useState, useEffect } from "react";
import PostItem from "../components/PostItem";
import { useParams } from "react-router-dom";
import axios from "axios";
import ListSkeleton from "../components/ListSkeleton";
import EmptyStateCard from "../components/EmptyStateCard";

const AuthorPosts = () => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authorName, setAuthorName] = useState("Author");

  const { id } = useParams();

  useEffect(() => {
    let ignore = false;
    setIsLoading(true);

    axios
      .get(`${process.env.REACT_APP_BASE_URL}/posts/users/${id}`)
      .then((res) => {
        if (!ignore) setPosts(res.data);
      })
      .catch((err) => console.error("Error fetching author posts:", err))
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [id]);

  useEffect(() => {
    let ignore = false;

    axios
      .get(`${process.env.REACT_APP_BASE_URL}/users/${id}`)
      .then((res) => {
        if (!ignore) {
          const resolvedName =
            res.data?.user?.name || res.data?.name || "Author";
          setAuthorName(resolvedName);
        }
      })
      .catch(() => {
        if (!ignore) setAuthorName("Author");
      });

    return () => {
      ignore = true;
    };
  }, [id]);

  if (isLoading) return <ListSkeleton count={6} />;

  return (
    <section className="posts filtered-posts-page author-posts-page">
      <div className="container posts__heading">
        <div>
          <p className="posts__kicker">Author</p>
          <h2>Posts by {authorName}</h2>
        </div>
      </div>
      {posts.length > 0 ? (
        <div className="container author-posts__container">
          {posts.map((post) => (
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
          title={`No posts found for ${authorName} yet`}
          subtitle="Check back soon or explore other authors."
        />
      )}
    </section>
  );
};

export default AuthorPosts;
