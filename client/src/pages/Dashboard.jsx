import React, { useState, useContext, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { UserContext } from "../context/userContext";
import axios from "axios";
import DeletePosts from "./DeletePosts.jsx";
import ListSkeleton from "../components/ListSkeleton";
import EmptyStateCard from "../components/EmptyStateCard";

const Dashboard = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [engagement, setEngagement] = useState({
    totalLikes: 0,
    totalComments: 0,
    totalFollowers: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { id } = useParams();
  const { currentUser } = useContext(UserContext);
  const token = currentUser?.token;

  // Redirect if not logged in
  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/posts/users/${id}`,
          {
            withCredentials: true,
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setPosts(response.data);
      } catch (error) {
        console.error(
          "Error fetching posts:",
          error.response?.data || error.message,
        );
      }
      setIsLoading(false);
    };

    fetchPosts();
  }, [id, token]);

  useEffect(() => {
    if (!token) return;

    const fetchEngagementMetrics = async () => {
      try {
        // Fetch followers count
        const followersResp = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/follows/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          },
        );
        const followers = followersResp.data?.followerCount || 0;

        setEngagement((prev) => ({
          ...prev,
          totalFollowers: followers,
        }));
      } catch (error) {
        // Silent fail for engagement metrics
      }
    };

    fetchEngagementMetrics();
  }, [token, id]);

  const categoriesCount = new Set(posts.map((post) => post.category)).size;
  const latestPostDate = posts.length
    ? new Date(posts[0].updatedAt || posts[0].createdAt)
    : null;
  const latestActivity = latestPostDate
    ? latestPostDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "No activity";

  if (isLoading) return <ListSkeleton count={5} />;

  return (
    <section className="dashboard">
      <div className="container dashboard__container">
        <div className="dashboard__hero">
          <p>Creator Dashboard</p>
          <h2>Your content performance at a glance</h2>
        </div>

        <div className="dashboard__kpis">
          <article className="dashboard__kpi-card">
            <p>Total Posts</p>
            <h3>{posts.length}</h3>
          </article>
          <article className="dashboard__kpi-card">
            <p>Categories</p>
            <h3>{categoriesCount}</h3>
          </article>
          <article className="dashboard__kpi-card">
            <p>Followers</p>
            <h3>{engagement.totalFollowers}</h3>
          </article>
          <article className="dashboard__kpi-card">
            <p>Latest Activity</p>
            <h3>{latestActivity}</h3>
          </article>
        </div>

        {posts.length > 0 ? (
          <>
            {posts.map((post) => (
              <article key={post._id} className="dashboard__post">
                <div className="dashboard__post-info">
                  <div className="dashboard__post-thumbnail">
                    <img
                      src={`${process.env.REACT_APP_ASSETS_URL}/uploads/${post.thumbnail}`}
                      alt={post.title}
                    />
                  </div>
                  <h5 className="dashboard__post-ititle">{post.title}</h5>
                  <small className="dashboard__post-category">{post.category}</small>
                </div>
                <div className="dashboard__post-action">
                  <Link to={`/posts/${post._id}`} className="btn sm">
                    View
                  </Link>
                  <Link
                    to={`/posts/${post._id}/edit`}
                    className="btn sm primary"
                  >
                    Edit
                  </Link>
                  <DeletePosts postId={post._id} />
                </div>
              </article>
            ))}
          </>
        ) : (
          <EmptyStateCard
            title="You haven't written any posts yet"
            subtitle="Create your first post to start building your audience and engagement."
          />
        )}
      </div>
    </section>
  );
};

export default Dashboard;
