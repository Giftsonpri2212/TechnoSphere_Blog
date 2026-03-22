import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { UserContext } from "../context/userContext.js";

const Login = () => {
  const [userData, setUserData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const { setCurrentUser, showToast } = useContext(UserContext);

  const changeInputHandler = (e) => {
    setUserData((prevState) => {
      return { ...prevState, [e.target.name]: e.target.value };
    });
  };

  const loginUser = async (e) => {
    e.preventDefault();
    setError("");

    if (!userData.email.trim() || !userData.password.trim()) {
      const message = "Please enter both email and password.";
      setError(message);
      showToast(message, "error");
      return;
    }

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BASE_URL}/users/login`,
        userData,
      );
      const user = response.data; // Use response.data to get user
      setCurrentUser(user);
      showToast(`Welcome back, ${user.name}!`, "success");
      navigate("/"); // Redirect to the homepage on successful login
    } catch (err) {
      const message =
        err.response?.status === 422
          ? "Please check your email and password."
          : err.response?.data?.message || "Login failed. Please try again.";
      setError(message);
      showToast(message, "error");
    }
  };

  return (
    <section className="auth-shell login">
      <div className="container auth-shell__container">
        <div className="auth-shell__hero">
          <p className="auth-shell__eyebrow">DevPort Workspace</p>
          <h2>Welcome back to your creator command center.</h2>
          <p>
            Continue publishing high-impact engineering stories with analytics,
            comments, and growth tools in one polished dashboard.
          </p>
          <div className="auth-shell__pills">
            <span>Real-time insights</span>
            <span>AI writing support</span>
            <span>Audience growth tools</span>
          </div>
          <ul className="auth-shell__highlights">
            <li>Track reader engagement for every post.</li>
            <li>Draft and iterate faster with AI assistance.</li>
            <li>Keep your content, comments, and notifications in sync.</li>
          </ul>
        </div>

        <div className="auth-shell__card">
          <h3>Welcome Back</h3>
          <p className="auth-shell__card-subtitle">
            Sign in to continue building your DevPort presence.
          </p>
          <form className="form login__form" onSubmit={loginUser}>
            {error && <p className="form__error-message">{error}</p>}
            <input
              type="text"
              placeholder="Email"
              name="email"
              value={userData.email}
              onChange={changeInputHandler}
              autoFocus
            />
            <input
              type="password"
              placeholder="Password"
              name="password"
              value={userData.password}
              onChange={changeInputHandler}
            />
            <button type="submit" className="btn primary">
              Login
            </button>
          </form>
          <small className="auth-shell__footnote">
            Don't have an account? <Link to="/register">Sign Up</Link>
          </small>
        </div>
      </div>
    </section>
  );
};

export default Login;
