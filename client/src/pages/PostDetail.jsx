import React, { useEffect, useContext, useState } from "react";
import PostAuthor from "../components/PostAuthor";
import { Link, useParams } from "react-router-dom";
import Loader from "./Loader";
import DeletePosts from "./DeletePosts";
import { UserContext } from "../context/userContext";
import axios from "axios";

const PostDetail = () => {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const { currentUser } = useContext(UserContext);

  useEffect(() => {
    const getPost = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/posts/${id}`
        );
        setPost(response.data);
      } catch (error) {
        setError(error);
      }
      setIsLoading(false);
    };

    getPost();
  }, []);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <section className="post-detail">
      {error && <p className="error">{error} </p>}
      {post && (
        <div className="container post-detail__container">
          <div className="post-detail__header">
            {/* PostAuthor requires props (authorID, createdAt) 
              – but leaving as is for now */}
            <PostAuthor authorID={post.creator} createdAt={post.createdAt} />

            {currentUser?.id == post?.creator && (
              <div className="post-detail__button">
                <Link
                  to={`/posts/${post?._id}/edit`}
                  className="btn sm primary"
                >
                  Edit
                </Link>
                <DeletePosts postId={id} />
              </div>
            )}
          </div>

          <h1>{post.title}</h1>

          <div className="post-detail__thumbnail">
            {/* Fixed img tag */}
            <img
              src={`${process.env.REACT_APP_ASSETS_URL}/uploads/${post.thumbnail}`}
              alt="Post Thumbnail"
            />
          </div>
          <p dangerouslySetInnerHTML={{ __html: post.description }}></p>
        </div>
      )}
    </section>
  );
};

export default PostDetail;
