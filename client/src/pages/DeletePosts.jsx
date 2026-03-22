import React, { useContext, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { UserContext } from "../context/userContext";
import axios from "axios";
import Loader from "./Loader";
import { useState } from "react";

const DeletePosts = ({ postId: id }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useContext(UserContext);
  const token = currentUser?.token;
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  const removePost = async (id) => {
    setIsLoading(true);
    try {
      const response = await axios.delete(
        `${process.env.REACT_APP_BASE_URL}/posts/${id}`,
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.status === 200) {
        if (location.pathname === `/myposts/${currentUser.id}`) {
          window.location.reload(); // refresh the page
        } else {
          navigate("/");
        }
      }
      setIsLoading(false);
    } catch (error) {
      console.error(
        "Error deleting post:",
        error.response?.data || error.message
      );
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <button className="btn sm danger" onClick={() => removePost(id)}>
      Delete
    </button>
  );
};

export default DeletePosts;
