import React from "react";
import { Link } from "react-router-dom";

const trendingTags = [
  { label: "Web Dev", slug: "webdevelopment" },
  { label: "Machine Learning", slug: "machinelearning" },
  { label: "Cloud", slug: "cloudcomputing" },
  { label: "Interview Prep", slug: "interviewpreparation" },
  { label: "Cybersecurity", slug: "cybersecurity" },
  { label: "Data Science", slug: "datascience" },
];

const HomeSidebar = () => {
  return (
    <aside className="home-sidebar">
      <article className="sidebar-card">
        <h3>Trending Topics</h3>
        <p>Curated categories developers are reading this week.</p>
        <div className="sidebar-tags">
          {trendingTags.map((tag) => (
            <Link
              key={tag.slug}
              to={`/posts/categories/${tag.slug}`}
              className="sidebar-tag"
            >
              {tag.label}
            </Link>
          ))}
        </div>
      </article>

      <article className="sidebar-card">
        <h3>Level Up Faster</h3>
        <p>
          Publish practical lessons, share project retros, and build your
          engineering brand with high-signal writing.
        </p>
        <div className="sidebar-actions">
          <Link to="/create" className="btn primary">
            Write a Post
          </Link>
          <Link to="/authors" className="btn">
            Explore Authors
          </Link>
        </div>
      </article>

      <article className="sidebar-card sidebar-card--subtle">
        <h3>Writing Tips</h3>
        <ul>
          <li>Start with one real-world problem.</li>
          <li>Show decisions and tradeoffs clearly.</li>
          <li>Add code snippets with brief context.</li>
        </ul>
      </article>
    </aside>
  );
};

export default HomeSidebar;