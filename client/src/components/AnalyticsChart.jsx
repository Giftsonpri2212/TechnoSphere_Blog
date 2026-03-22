import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const AnalyticsChart = ({ data = [] }) => {
  if (!data.length) return null;

  const chartData = data.map((item) => ({
    name:
      item.title?.length > 18 ? `${item.title.slice(0, 18)}...` : item.title,
    views: item.views,
    readTime: item.readTimeTotal,
  }));

  return (
    <div className="analytics-chart">
      <h3>Post Performance</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="views" fill="#0f766e" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AnalyticsChart;
