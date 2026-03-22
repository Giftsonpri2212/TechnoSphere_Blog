import React from "react";
import Posts from "../components/Posts";
import { Link } from "react-router-dom";
import { UserContext } from "../context/userContext";
import HomeSidebar from "../components/HomeSidebar";

const Home = () => {
  const { currentUser } = React.useContext(UserContext);

  return (
    <section className="home-v2">
      <div className="home-v2__layout">
        <div className="home-v2__main">
          <div className="home-v2__hero">
            <p className="home-v2__kicker">Build. Share. Grow.</p>
            <h1>High-signal writing for engineers who ship products.</h1>
            <p className="home-v2__lead">
              Read practical breakdowns, architecture notes, interview prep,
              and emerging tech insights from developers across the community.
            </p>
            <div className="home-v2__actions">
              {currentUser?.id ? (
                <>
                  <Link to="/create" className="btn primary">
                    Write with AI
                  </Link>
                  <Link to={`/myposts/${currentUser.id}`} className="btn">
                    Open Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/register" className="btn primary">
                    Start Writing
                  </Link>
                  <Link to="/login" className="btn">
                    Login
                  </Link>
                </>
              )}
            </div>
          </div>

          <Posts />
        </div>

        <HomeSidebar />
      </div>
    </section>
  );
};

export default Home;
