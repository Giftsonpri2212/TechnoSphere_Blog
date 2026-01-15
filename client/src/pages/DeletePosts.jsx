import React, { useContext, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios"; // ✅ Missing import
import { UserContext } from "../context/userContext";

const DeletePosts = ({ id }) => {
  // ✅ Accept id as prop
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useContext(UserContext);
  const token = currentUser?.token;

  // Redirect to login if not logged in
  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  const removePost = async (id) => {
    try {
      const response = await axios.delete(
        `${process.env.REACT_APP_}/posts/${id}`,
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.status === 200) {
        if (location.pathname === `/myposts/${currentUser.id}`) {
          navigate(0); // refresh page
        } else {
          navigate("/");
        }
      }
    } catch (error) {
      console.error("Couldn't delete post", error);
    }
  };

  return (
    <Link className="btn sm danger" onClick={() => removePost(id)}>
      Delete
    </Link>
  );
};

export default DeletePosts;
