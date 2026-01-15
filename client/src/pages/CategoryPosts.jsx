import React, { useState, useEffect } from "react";
import PostItem from "../components/PostItem";
import Loader from "./Loader";
import { useParams } from "react-router-dom";
import axios from "axios";

const CategoryPosts = () => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const { category } = useParams();

  useEffect(() => {
    let ignore = false; // safeguard against setting state after unmount
    setIsLoading(true);

    axios
      .get(`${process.env.REACT_APP_BASE_URL}/posts/categories/${category}`)
      .then((res) => {
        if (!ignore) setPosts(res.data);
      })
      .catch((err) => console.error("Error fetching category posts:", err))
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    }; // cleanup
  }, [category]);

  if (isLoading) {
    return <Loader />;
  }

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

export default CategoryPosts;
