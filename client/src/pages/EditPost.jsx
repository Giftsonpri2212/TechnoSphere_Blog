import React, { useState, useContext, useEffect } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { useNavigate, useParams } from "react-router-dom";
import { UserContext } from "../context/userContext";
import axios from "axios";
import DOMPurify from "dompurify";

const EditPost = () => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState(null);
  const [error, setError] = useState("");
  const [aiTopic, setAiTopic] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [versions, setVersions] = useState([]);
  const [isPreview, setIsPreview] = useState(false);
  const [autosaveState, setAutosaveState] = useState("idle");
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const navigate = useNavigate();
  const { id } = useParams();

  const { currentUser, showToast } = useContext(UserContext);
  const token = currentUser?.token;

  // Redirect if not logged in
  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  // Exact same categories as backend schema
  const POST_CATEGORIES = [
    "Programming",
    "DSA",
    "Competetive Programming",
    "Web Development",
    "Mobile App Development",
    "Data Science",
    "Machine Learning",
    "Devops",
    "Cloud Computing",
    "Cybersecurity",
    "Interview Preparation",
    "Tech Trends",
    "Opportunities in Tech",
  ];

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      ["bold", "italic", "underline", "strike", "blockquote"],
      [
        { list: "ordered" },
        { list: "bullet" },
        { indent: "-1" },
        { indent: "+1" },
      ],
      ["link", "image"],
      ["clean"],
    ],
  };

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "blockquote",
    "list",
    "bullet",
    "indent",
    "link",
    "image",
  ];

  // Fetch existing post data
  useEffect(() => {
    const getPost = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/posts/${id}`,
        );
        setTitle(response.data.title);
        setCategory(response.data.category);
        setDescription(response.data.description);
      } catch (error) {
        console.error("Fetch post error:", error);
        setError("Could not load post");
      }
    };
    getPost();
  }, [id]);

  useEffect(() => {
    if (!token || !id) return;

    const fetchVersions = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BASE_URL}/posts/${id}/versions`,
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          },
        );
        setVersions(response.data || []);
      } catch (error) {
        setVersions([]);
      }
    };

    fetchVersions();
  }, [token, id]);

  useEffect(() => {
    if (!token || !id) return;

    const saveDraft = async () => {
      if (!title.trim() && !category.trim() && !description.trim()) return;
      setAutosaveState("saving");
      try {
        await axios.post(
          `${process.env.REACT_APP_BASE_URL}/drafts/autosave`,
          { title, category, description, postId: id },
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          },
        );
        setAutosaveState("saved");
        setLastSavedAt(new Date());
      } catch (error) {
        setAutosaveState("error");
      }
    };

    const timer = setInterval(() => {
      saveDraft();
    }, 5000);

    return () => clearInterval(timer);
  }, [token, id, title, category, description]);

  const autosaveText =
    autosaveState === "saving"
      ? "Saving draft..."
      : autosaveState === "saved"
        ? `Saved ${lastSavedAt ? lastSavedAt.toLocaleTimeString("en-IN") : ""}`
        : autosaveState === "error"
          ? "Autosave unavailable"
          : "Draft idle";

  const rollbackVersion = async (versionId) => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BASE_URL}/posts/${id}/rollback/${versionId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        },
      );

      setTitle(response.data.title || "");
      setCategory(response.data.category || "");
      setDescription(response.data.description || "");
      showToast("Post rolled back successfully.", "success");
    } catch (error) {
      showToast(error.response?.data?.message || "Rollback failed.", "error");
    }
  };

  //  Update post handler
  const editPost = async (e) => {
    e.preventDefault();

    if (!POST_CATEGORIES.includes(category)) {
      const message = "Please select a valid category";
      setError(message);
      showToast(message, "error");
      return;
    }

    const postData = new FormData();
    postData.set("title", title);
    postData.set("category", category);
    postData.set("description", description);

    if (thumbnail && thumbnail !== "") {
      postData.set("thumbnail", thumbnail);
    }

    try {
      const response = await axios.patch(
        `${process.env.REACT_APP_BASE_URL}/posts/${id}`,
        postData,
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.status === 200) {
        showToast("Post updated successfully.", "success");
        navigate("/");
      } else {
        const message = "Post not updated. Try again!";
        setError(message);
        showToast(message, "error");
      }
    } catch (err) {
      console.error("Edit error:", err.response?.data || err.message);
      const message = err.response?.data?.message || "Something went wrong";
      setError(message);
      showToast(message, "error");
    }
  };

  const extractPlainText = (html = "") =>
    html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  const rewriteWithAi = async () => {
    const topic = aiTopic.trim() || title.trim();

    if (!topic) {
      const message = "Enter a topic before generating AI content.";
      setError(message);
      showToast(message, "error");
      return;
    }

    setIsGeneratingAi(true);
    setError("");

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BASE_URL}/posts/ai/draft`,
        {
          topic,
          category: category || "Programming",
          tone: "professional",
        },
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const generatedTitle = response.data?.title;
      const generatedDescription = response.data?.description;
      const generatedTextLength = extractPlainText(generatedDescription).length;

      if (!generatedDescription || generatedTextLength < 500) {
        throw new Error("AI returned short content. Please try again.");
      }

      if (generatedTitle) setTitle(generatedTitle);
      setDescription(generatedDescription);
      setAiTopic(topic);
      setIsPreview(false);

      const statusMessage = response.data?.aiExpanded
        ? "AI draft regenerated and expanded into a full article."
        : "AI draft regenerated with full article content.";

      showToast(statusMessage, "success");
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "AI draft generation failed.";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <section className="create-post">
      <div className="container">
        <div className="editor-shell__header">
          <h2>Edit Post</h2>
          <div className="editor-shell__actions">
            <span className={`editor-shell__autosave is-${autosaveState}`}>
              {autosaveText}
            </span>
            <button
              type="button"
              className="btn sm"
              onClick={() => setIsPreview((prev) => !prev)}
            >
              {isPreview ? "Edit Mode" : "Preview Mode"}
            </button>
          </div>
        </div>
        {error && <p className="form__error-message">{error}</p>}
        <form className="form create-post__form" onSubmit={editPost}>
          <div className="ai-tools">
            <div className="ai-tools__row">
              <input
                type="text"
                placeholder="AI topic (leave empty to use current title)"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
              />
              <button
                type="button"
                className="btn"
                onClick={rewriteWithAi}
                disabled={isGeneratingAi}
              >
                {isGeneratingAi ? "Generating..." : "Rewrite Using AI"}
              </button>
            </div>
            <p className="ai-tools__hint">
              AI can refresh the current post draft. Always review generated
              content before saving.
            </p>
          </div>

          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />

          <select
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="" disabled>
              -- Select a category --
            </option>
            {POST_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {isPreview ? (
            <article
              className="editor-preview"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(
                  description || "<p>Nothing to preview yet.</p>",
                ),
              }}
            />
          ) : (
            <ReactQuill
              modules={modules}
              formats={formats}
              value={description}
              onChange={setDescription}
            />
          )}

          <input
            type="file"
            onChange={(e) => setThumbnail(e.target.files[0])}
            accept="image/png, image/jpg, image/jpeg"
          />

          <button type="submit" className="btn primary">
            Update
          </button>

          {versions.length ? (
            <div className="version-history">
              <h4>Version History</h4>
              {versions.slice(0, 5).map((v) => (
                <div key={v._id} className="version-history__item">
                  <small>
                    Version {v.version} -{" "}
                    {new Date(v.createdAt).toLocaleString()}
                  </small>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => rollbackVersion(v._id)}
                  >
                    Rollback
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </form>
      </div>
    </section>
  );
};

export default EditPost;
