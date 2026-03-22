import React from "react";

const ListSkeleton = ({ count = 6 }) => {
  return (
    <div className="skeleton-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, idx) => (
        <article key={`skeleton-${idx}`} className="skeleton-card">
          <div className="skeleton skeleton__thumb" />
          <div className="skeleton-card__content">
            <div className="skeleton skeleton__line skeleton__line--title" />
            <div className="skeleton skeleton__line" />
            <div className="skeleton skeleton__line skeleton__line--short" />
          </div>
        </article>
      ))}
    </div>
  );
};

export default ListSkeleton;
