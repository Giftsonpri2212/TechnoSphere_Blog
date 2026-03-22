import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const RecommendationsPanel = ({ postId }) => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!postId) return;

    const fetchRecommendations = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/posts/${postId}/recommendations`,
        );
        setItems(response.data || []);
      } catch (error) {
        setItems([]);
      }
    };

    fetchRecommendations();
  }, [postId]);

  if (!items.length) return null;

  const formatSimilarity = (score) => {
    const value = Number(score);
    if (Number.isNaN(value)) return score;
    if (value <= 1) return `${Math.round(value * 100)}% match`;
    return `${Math.round(value)}% match`;
  };

  return (
    <section className="recommendations-panel">
      <h3>Recommended Posts</h3>
      <div className="recommendations-panel__list">
        {items.map((item) => (
          <Link
            key={item._id}
            to={`/posts/${item._id}`}
            className="recommendations-panel__item"
          >
            <h5>{item.title}</h5>
            <small>{formatSimilarity(item.similarity)}</small>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default RecommendationsPanel;
