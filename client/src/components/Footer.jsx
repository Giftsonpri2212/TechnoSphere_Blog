import React from "react";
import { Link } from "react-router-dom";
const Footer = () => {
  return (
    <footer>
      <ul className="footer__categories">
        <li>
          <Link to="/posts/categories/programming ">Programming</Link>
        </li>
        <li>
          <Link to="/posts/categories/dsa">DSA</Link>
        </li>
        <li>
          <Link to="/posts/categories/competetiveprogramming">
            Competetive Programming
          </Link>
        </li>
        <li>
          <Link to="/posts/categories/webdevelopment">Web Development</Link>
        </li>
        <li>
          <Link to="/posts/categories/mobileappdevelopment">
            Mobile App Development
          </Link>
        </li>
        <li>
          <Link to="/posts/categories/datascience">Data Science</Link>
        </li>
        <li>
          <Link to="/posts/categories/opportunitiesintech">
            Artificial Intelligence
          </Link>
        </li>
        <li>
          <Link to="/posts/categories/machinelearning">Machine Learning</Link>
        </li>
        <li>
          <Link to="/posts/categories/Devopsandcloud">Devops</Link>
        </li>
        <li>
          <Link to="/posts/categories/Devopsandcloud">Cloud Computing</Link>
        </li>
        <li>
          <Link to="/posts/categories/Cybersecurity">Cybersecurity</Link>
        </li>
        <li>
          <Link to="/posts/categories/interviewpreparation">
            Interview Preparation
          </Link>
        </li>
        <li>
          <Link to="/posts/categories/techtrends">Tech Trends</Link>
        </li>
        <li>
          <Link to="/posts/categories/opportunitiesintech">
            Opportunities in Tech
          </Link>
        </li>
      </ul>
      <div className="footer__copyright">
        <small>All Rights Reserved &copy; Copyright,TechnoSphere</small>
      </div>
    </footer>
  );
};

export default Footer;
