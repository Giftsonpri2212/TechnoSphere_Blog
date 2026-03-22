import React from "react";

const EmptyStateCard = ({ title, subtitle }) => {
  return (
    <div className="empty-state-card">
      <h3>{title}</h3>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  );
};

export default EmptyStateCard;
