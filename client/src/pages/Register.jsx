import React from "react";
import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { UserContext } from "../context/userContext";
const Register = () => {
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    password: "",
    password2: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { showToast } = useContext(UserContext);
  const changeInputHandler = (e) => {
    setUserData((prevState) => {
      return { ...prevState, [e.target.name]: e.target.value };
    });
  };

  const registerUser = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !userData.name ||
      !userData.email ||
      !userData.password ||
      !userData.password2
    ) {
      const message = "Please fill in all registration fields.";
      setError(message);
      showToast(message, "error");
      return;
    }

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BASE_URL}/users/register`,
        userData,
      );
      const newUser = await response.data;
      if (!newUser) {
        setError("Couldn't register user. Please try again");
        showToast("Couldn't register user. Please try again.", "error");
        return;
      }
      showToast("Registration successful. Please log in.", "success");
      navigate("/login");
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Registration failed. Please check your server and try again.";
      setError(message);
      showToast(message, "error");
    }
  };
  return (
    <section className="auth-shell register">
      <div className="container auth-shell__container">
        <div className="auth-shell__hero">
          <p className="auth-shell__eyebrow">Start Publishing</p>
          <h2>Create your premium DevPort creator profile.</h2>
          <p>
            Launch your writing brand, publish with confidence, and build a
            loyal developer audience.
          </p>
          <div className="auth-shell__pills">
            <span>Fast onboarding</span>
            <span>Creator analytics</span>
            <span>Community visibility</span>
          </div>
          <ul className="auth-shell__highlights">
            <li>Publish polished posts with an intuitive editor.</li>
            <li>Measure growth with dashboards and engagement data.</li>
            <li>Connect with readers through comments and follows.</li>
          </ul>
        </div>

        <div className="auth-shell__card">
          <h3>Sign Up</h3>
          <p className="auth-shell__card-subtitle">
            Create your account and start your first post today.
          </p>
          <form className="form regiter__form" onSubmit={registerUser}>
            {error && <p className="form__error-message">{error}</p>}
            <input
              type="text"
              placeholder="Full Name"
              name="name"
              value={userData.name}
              onChange={changeInputHandler}
              autoFocus
            />
            <input
              type="text"
              placeholder="Email"
              name="email"
              value={userData.email}
              onChange={changeInputHandler}
            />
            <input
              type="password"
              placeholder="Password"
              name="password"
              value={userData.password}
              onChange={changeInputHandler}
            />
            <input
              type="password"
              placeholder="Confirm Password"
              name="password2"
              value={userData.password2}
              onChange={changeInputHandler}
            />
            <button type="submit" className="btn primary">
              Register
            </button>
          </form>
          <small className="auth-shell__footnote">
            Already have an account? <Link to="/login">Sign in</Link>
          </small>
        </div>
      </div>
    </section>
  );
};

export default Register;
