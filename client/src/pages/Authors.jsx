import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const Authors = () => {
  const [authors, setAuthors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const getAuthors = async () => {
      setIsLoading(true);
      try {
        const url = `${process.env.REACT_APP_BASE_URL}/users`;
        console.log("Fetching authors from:", url);
        const response = await axios.get(url);
        console.log("API response:", response.data);
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
        <h2 className="center">Loading...</h2>
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
                  alt={`Image of ${author.name}`}
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
        <h2 className="center">No users/authors found</h2>
      )}
    </section>
  );
};

export default Authors;
