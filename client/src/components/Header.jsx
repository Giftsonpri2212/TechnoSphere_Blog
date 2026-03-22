import React, { useState, useContext, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "../images/devport-logo.svg";
import { FaBars } from "react-icons/fa";
import { AiOutlineClose, AiOutlineSearch } from "react-icons/ai";
import { FiMoon, FiSun } from "react-icons/fi";
import { UserContext } from "../context/userContext";
import NotificationBell from "./NotificationBell";

const Header = ({ theme = "light", onToggleTheme }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const query = new URLSearchParams(location.search).get("q") || "";
    setSearchValue(query);
  }, [location.search]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
  }, [location.pathname]);

  const { currentUser } = useContext(UserContext);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = searchValue.trim();
    if (!trimmed) {
      navigate("/");
      return;
    }
    navigate(`/?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <header className="topbar">
      <div className="container topbar__inner">
        <Link to="/" className="topbar__brand" aria-label="Go to homepage">
          <img src={Logo} alt="DevPort logo" />
          <span>DevPort</span>
        </Link>

        <form className="topbar__search" onSubmit={handleSearchSubmit}>
          <AiOutlineSearch aria-hidden="true" />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search posts, topics, and categories"
            aria-label="Search posts"
          />
        </form>

        <div className="topbar__actions">
          <button
            type="button"
            className="topbar__theme-toggle"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? <FiMoon /> : <FiSun />}
          </button>

          <button
            type="button"
            className="topbar__toggle"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation"
          >
            {isMobileMenuOpen ? <AiOutlineClose /> : <FaBars />}
          </button>

          {currentUser?.id ? (
            <>
              <Link to="/create" className="topbar__create-link">
                Create
              </Link>

              <NotificationBell />

              <div className="topbar__profile-menu">
                <button
                  type="button"
                  className="topbar__profile-trigger"
                  onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                  aria-haspopup="menu"
                  aria-expanded={isProfileMenuOpen}
                >
                  <span>{currentUser?.name?.slice(0, 1)?.toUpperCase() || "U"}</span>
                </button>

                {isProfileMenuOpen ? (
                  <div className="topbar__profile-dropdown" role="menu">
                    <Link to={`/profile/${currentUser.id}`} role="menuitem">
                      Profile
                    </Link>
                    <Link to={`/myposts/${currentUser.id}`} role="menuitem">
                      Dashboard
                    </Link>
                    <Link to="/notifications" role="menuitem">
                      Notifications
                    </Link>
                    <Link to="/logout" role="menuitem">
                      Logout
                    </Link>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="topbar__guest-links">
              <Link to="/login">Login</Link>
              <Link to="/register" className="btn primary sm">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className={`topbar__mobile-panel ${isMobileMenuOpen ? "show" : ""}`}>
        <ul>
          <li>
            <button
              type="button"
              className="topbar__mobile-theme-toggle"
              onClick={onToggleTheme}
            >
              {theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            </button>
          </li>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/authors">Authors</Link>
          </li>
          {currentUser?.id ? (
            <>
              <li>
                <Link to={`/profile/${currentUser.id}`}>Profile</Link>
              </li>
              <li>
                <Link to={`/myposts/${currentUser.id}`}>Dashboard</Link>
              </li>
              <li>
                <Link to="/create">Create Post</Link>
              </li>
              <li>
                <Link to="/notifications">Notifications</Link>
              </li>
              <li>
                <Link to="/logout">Logout</Link>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link to="/login">Login</Link>
              </li>
              <li>
                <Link to="/register">Register</Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </header>
  );
};

export default Header;
