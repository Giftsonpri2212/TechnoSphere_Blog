import React, { useState, useEffect } from "react";
import PostItem from "../components/PostItem";
import Loader from "./Loader";
import { useParams } from "react-router-dom";
import axios from "axios";

const AuthorPosts = () => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

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
    }; // cleanup
  }, [id]); // ✅ runs whenever author id changes

  if (isLoading) return <Loader />;

  return (
    <section className="posts">
      {posts.length > 0 ? (
        <div className="container posts__container">
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
        <h2 className="center">No Posts Found</h2>
      )}
    </section>
  );
};

export default AuthorPosts;
