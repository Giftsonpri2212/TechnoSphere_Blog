/**
 * LAYOUT COMPONENT
 *
 * @description Root layout wrapper component that provides consistent structure
 * across all pages. Includes header, page content (Outlet), and footer.
 *
 * @component
 * @returns {JSX.Element} Layout structure with Header, Outlet (nested routes), and Footer
 *
 * @usage
 * Used in React Router as a parent route to wrap all child routes
 * <Route path="/" element={<Layout />}>
 *   <Route index element={<Home />} />
 * </Route>
 *
 * @architecture
 * The Outlet component from React Router renders child routes in place
 * This allows header/footer to persist across different pages
 */

import React, { useContext, useEffect, useState } from "react";
import Footer from "./Footer";
import Header from "./Header";
import { Outlet, useLocation } from "react-router-dom";
import ToastHost from "./ToastHost";
import { UserContext } from "../context/userContext";

/**
 * Main Layout Component
 * @returns {JSX.Element} Rendered layout with persistent Header/Footer
 */
const Layout = () => {
  const { toasts, dismissToast } = useContext(UserContext);
  const [theme, setTheme] = useState("light");
  const location = useLocation();

  // Map routes to page names for dynamic titles
  const getPageTitle = (pathname) => {
    const pathMap = {
      "/": "Home",
      "/posts/": "Post",
      "/register": "Register",
      "/login": "Login",
      "/profile/": "Profile",
      "/authors": "Authors",
      "/create": "Create Post",
      "/posts/users/": "Author Posts",
      "/posts/categories/": "Category",
      "/myposts/": "Dashboard",
      "/edit": "Edit Post",
      "/notifications": "Notifications",
      "/logout": "Logout",
    };

    // Find matching route
    for (const [path, title] of Object.entries(pathMap)) {
      if (pathname === path || pathname.startsWith(path)) {
        return title;
      }
    }
    return "Home";
  };

  useEffect(() => {
    const pageTitle = getPageTitle(location.pathname);
    document.title = pageTitle === "Home" ? "DevPort" : `DevPort / ${pageTitle}`;
  }, [location.pathname]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("devport-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    setTheme(initialTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("devport-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <div className="app-shell">
      <Header theme={theme} onToggleTheme={toggleTheme} />

      <main className="app-content app-content--framed">
        <Outlet />
      </main>

      <Footer />

      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default Layout;
