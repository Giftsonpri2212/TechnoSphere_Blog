import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import ListSkeleton from "../components/ListSkeleton";
import EmptyStateCard from "../components/EmptyStateCard";

const Authors = () => {
  const [authors, setAuthors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const getAuthors = async () => {
      setIsLoading(true);
      try {
        const url = `${process.env.REACT_APP_BASE_URL}/users`;
        const response = await axios.get(url);
        setAuthors(response.data);
      } catch (error) {
        console.error("Error fetching authors:", error);
      }
      setIsLoading(false);
    };
    getAuthors();
  }, []);

  return (
    <section className="authors">
      {isLoading ? (
        <ListSkeleton count={8} />
      ) : authors.length > 0 ? (
        <div className="container authors__container">
          {authors.map((author) => (
            <Link
              key={author._id}
              to={`/posts/users/${author._id}`}
              className="author__link"
            >
              <div className="author__avatar">
                <img
                  src={
                    author.avatar
                      ? `${process.env.REACT_APP_ASSETS_URL}/uploads/${author.avatar}`
                      : "/default-avatar.png"
                  }
                  alt={`${author.name} avatar`}
                />
              </div>
              <div className="author__info">
                <h4>{author.name}</h4>
                <p>{author.posts} posts</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyStateCard
          title="No authors found"
          subtitle="No author profiles are available right now."
        />
      )}
    </section>
  );
};

export default Authors;
