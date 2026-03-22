import React, { useState, useContext, useEffect } from "react";
import { FaCheck, FaEdit } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { UserContext } from "../context/userContext";
import axios from "axios";
import DeletePosts from "./DeletePosts.jsx";

const UserProfile = () => {
  const [avatar, setAvatar] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isAvatarTouched, setIsAvatarTouched] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("profile");
  const [posts, setPosts] = useState([]);
  const [engagement, setEngagement] = useState({ totalFollowers: 0 });
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const navigate = useNavigate();
  const { currentUser, showToast } = useContext(UserContext);
  const token = currentUser?.token;

  // Redirect if not logged in
  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  // Fetch user profile
  useEffect(() => {
    const getUser = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/users/${currentUser.id}`,
          {
            withCredentials: true,
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        const {
          name: fetchedName,
          email: fetchedEmail,
          avatar: fetchedAvatar,
        } = response.data;

        setName(fetchedName || "");
        setEmail(fetchedEmail || "");
        setAvatar(fetchedAvatar || null);
      } catch (error) {
        console.error(
          "Error fetching user:",
          error.response?.data || error.message,
        );
      }
    };

    if (token && currentUser?.id) {
      getUser();
    }
  }, [token, currentUser?.id]);

  useEffect(() => {
    if (activeTab !== "dashboard" || !token) return;
    const fetchDashboardData = async () => {
      setIsDashboardLoading(true);
      try {
        const postsResp = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/posts/users/${currentUser.id}`,
          {
            withCredentials: true,
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setPosts(postsResp.data || []);
        try {
          const followersResp = await axios.get(
            `${process.env.REACT_APP_BASE_URL}/follows/${currentUser.id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
              withCredentials: true,
            },
          );
          setEngagement((prev) => ({
            ...prev,
            totalFollowers: followersResp.data?.followerCount || 0,
          }));
        } catch (err) {
          console.error("Error fetching followers:", err);
        }
      } catch (error) {
        console.error("Error fetching posts:", error);
        setPosts([]);
      } finally {
        setIsDashboardLoading(false);
      }
    };
    fetchDashboardData();
  }, [activeTab, token, currentUser?.id]);

  // Handle avatar upload
  const changeAvatarHandler = async () => {
    setIsAvatarTouched(false);
    try {
      const formData = new FormData();
      formData.append("avatar", avatar);

      const response = await axios.post(
        `${process.env.REACT_APP_BASE_URL}/users/change-avatar`,
        formData,
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setAvatar(response?.data.avatar);
    } catch (error) {
      console.error(
        "Error updating avatar:",
        error.response?.data || error.message,
      );
    }
  };

  // Handle profile update (name, email, password)
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const userData = new FormData();
      userData.set("name", name);
      userData.set("email", email);
      userData.set("currentPassword", currentPassword);
      userData.set("newPassword", newPassword);
      userData.set("confirmNewPassword", confirmNewPassword);

      const response = await axios.patch(
        `${process.env.REACT_APP_BASE_URL}/users/edit-user`,
        userData,
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      showToast("Profile updated successfully.", "success");
      if (response.status === 200) {
        navigate("/logout");
      }
    } catch (error) {
      console.error(
        "Error updating profile:",
        error.response?.data || error.message,
      );
      setError(error.response.data.message);
    }
  };

  return (
    <section className="profile">
      <div className="container profile__container">
        <div className="profile__hero">
          <p>Account Center</p>
          <h2>Manage your creator identity and publishing workflow</h2>
        </div>

        <div className="profile__tabs">
          <button
            className={`profile__tab ${activeTab === "profile" ? "is-active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            Profile Settings
          </button>
          <button
            className={`profile__tab ${activeTab === "dashboard" ? "is-active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            My Dashboard
          </button>
        </div>

        {activeTab === "profile" && (
          <div className="profile__details">
            {/* Avatar Section */}
            <div className="avatar__wrapper">
              <div className="profile__avatar">
                {avatar ? (
                  <img
                    src={`${process.env.REACT_APP_ASSETS_URL}/uploads/${avatar}`}
                    alt="User Avatar"
                  />
                ) : (
                  <span>No Avatar</span>
                )}
              </div>
              <form className="avatar__form">
                <input
                  type="file"
                  name="avatar"
                  id="avatar"
                  onChange={(e) => {
                    setAvatar(e.target.files[0]);
                    setIsAvatarTouched(true);
                  }}
                  accept="image/png, image/jpeg, image/jpg"
                />
                <label htmlFor="avatar">
                  <FaEdit />
                </label>
              </form>
              {isAvatarTouched && (
                <button
                  type="button"
                  className="profile__avatar-btn"
                  onClick={changeAvatarHandler}
                >
                  <FaCheck />
                </button>
              )}
            </div>

            {/* User Info */}
            <h1>{name}</h1>
            <p>{email}</p>

            {/* Profile Form */}
            <form className="form profile__form" onSubmit={handleProfileUpdate}>
              {error && <p className="form__error-message">{error}</p>}
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                type="email"
                placeholder="Email id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <input
                type="password"
                placeholder="Confirm New Password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
              <button type="submit" className="btn primary">
                Update Profile
              </button>
            </form>
          </div>
        )}

        {activeTab === "dashboard" && (
          <div className="profile__dashboard">
            {isDashboardLoading ? (
              <div className="loading">
                <p>Loading dashboard...</p>
              </div>
            ) : (
              <>
                <div className="dashboard__kpis">
                  <article className="dashboard__kpi-card">
                    <p>Total Posts</p>
                    <h3>{posts.length}</h3>
                  </article>
                  <article className="dashboard__kpi-card">
                    <p>Categories</p>
                    <h3>
                      {posts.length > 0
                        ? new Set(posts.map((p) => p.category)).size
                        : 0}
                    </h3>
                  </article>
                  <article className="dashboard__kpi-card">
                    <p>Followers</p>
                    <h3>{engagement.totalFollowers}</h3>
                  </article>
                  <article className="dashboard__kpi-card">
                    <p>Latest Activity</p>
                    <h3>
                      {posts.length > 0
                        ? new Date(
                            posts[0].updatedAt || posts[0].createdAt,
                          ).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "No activity"}
                    </h3>
                  </article>
                </div>
                {posts.length > 0 ? (
                  <div className="dashboard__posts-list">
                    {posts.map((post) => (
                      <article key={post._id} className="dashboard__post">
                        <div className="dashboard__post-info">
                          <div className="dashboard__post-thumbnail">
                            <img
                              src={`${process.env.REACT_APP_ASSETS_URL}/uploads/${post.thumbnail}`}
                              alt={post.title}
                            />
                          </div>
                          <div className="dashboard__post-details">
                            <h5>{post.title}</h5>
                            <p className="dashboard__post-category">
                              {post.category}
                            </p>
                          </div>
                        </div>
                        <div className="dashboard__post-actions">
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
                  </div>
                ) : (
                  <div className="empty-state">
                    <h3>You haven't written any posts yet</h3>
                    <p>
                      Create your first post to start building your audience.
                    </p>
                    <Link to="/create" className="btn primary">
                      Create Post
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default UserProfile;
