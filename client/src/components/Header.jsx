import React, { useState, useContext } from "react";
import { Link } from "react-router-dom";
import Logo from "../images/Logo.jpg";
import { FaBars } from "react-icons/fa";
import { AiOutlineClose } from "react-icons/ai";
import { UserContext } from "../context/userContext";
const Header = () => {
  const [isNavShowing, setIsNavShowing] = useState(
    window.innerWidth > 800 ? true : false
  );
  const toggleNav = () => {
    setIsNavShowing(!isNavShowing);
  };
  const { currentUser } = useContext(UserContext);

  const closeNavHandler = () => {
    if (window.innerwidth < 800) {
      setIsNavShowing(false);
    } else {
      setIsNavShowing(true);
    }
  };

  return (
    <nav>
      <div className="container nav_container">
        <Link to="/" className="nav_logo">
          <img src={Logo} alt="Navbar Logo" onClick={closeNavHandler} />
        </Link>
        {currentUser?.id && isNavShowing && (
          <ul className={`nav_menu ${isNavShowing ? "show" : ""}`}>
            <li>
              <Link to="/profile/gtgtgt" onClick={closeNavHandler}>
                {currentUser?.name}
              </Link>
            </li>
            <li>
              <Link to="/create" onClick={closeNavHandler}>
                Create Post
              </Link>
            </li>
            <li>
              <Link to="/authors" onClick={closeNavHandler}>
                Authors
              </Link>
            </li>
            <li>
              <Link to="/logout" onClick={closeNavHandler}>
                Logout
              </Link>
            </li>
          </ul>
        )}
        {!currentUser?.id && isNavShowing && (
          <ul className={`nav_menu ${isNavShowing ? "show" : ""}`}>
            {" "}
            <li>
              <Link to="/authors" onClick={toggleNav}>
                Authors
              </Link>
            </li>
            <li>
              <Link to="/login" onClick={toggleNav}>
                Login
              </Link>
            </li>
          </ul>
        )}
        <button
          className="nav_toggle-btn"
          onClick={() => setIsNavShowing(!isNavShowing)}
        >
          {isNavShowing ? <AiOutlineClose /> : <FaBars />}
        </button>
      </div>
    </nav>
  );
};

export default Header;
