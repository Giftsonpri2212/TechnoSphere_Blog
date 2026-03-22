import React, { useState, useEffect } from "react";
import PostItem from "../components/PostItem";
import { useParams } from "react-router-dom";
import axios from "axios";
import ListSkeleton from "../components/ListSkeleton";
import EmptyStateCard from "../components/EmptyStateCard";

const CATEGORY_LABELS = {
  programming: "Programming",
  dsa: "DSA",
  competetiveprogramming: "Competetive Programming",
  webdevelopment: "Web Development",
  mobileappdevelopment: "Mobile App Development",
  datascience: "Data Science",
  machinelearning: "Machine Learning",
  devops: "Devops",
  cloudcomputing: "Cloud Computing",
  cybersecurity: "Cybersecurity",
  interviewpreparation: "Interview Preparation",
  techtrends: "Tech Trends",
  opportunitiesintech: "Opportunities in Tech",
};

const toTitleCase = (value = "") =>
  value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

const CategoryPosts = () => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const { category } = useParams();
  const decodedCategory = decodeURIComponent(category || "");
  const normalizedCategory = decodedCategory
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const readableCategory =
    CATEGORY_LABELS[normalizedCategory] || toTitleCase(decodedCategory);

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
    return <ListSkeleton count={6} />;
  }

  return (
    <section className="posts filtered-posts-page category-posts-page">
      <div className="container posts__heading">
        <div>
          <p className="posts__kicker">Category</p>
          <h2>{readableCategory || "Posts"}</h2>
        </div>
      </div>
      {posts.length > 0 ? (
        <div className="container category-posts__container">
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
          title="No posts found in this category yet"
          subtitle="Try another category or create a new post for this topic."
        />
      )}
    </section>
  );
};

export default CategoryPosts;
