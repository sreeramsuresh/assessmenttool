// src/components/Navbar.js
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../styles/Navbar.css";

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user is logged in
  useEffect(() => {
    const userInfo = localStorage.getItem("user");
    if (userInfo) {
      try {
        setUser(JSON.parse(userInfo));
      } catch (err) {
        console.error("Error parsing user info:", err);
      }
    }
  }, [location]);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  // Toggle mobile menu
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Hide menu when clicking a link on mobile
  const closeMenu = () => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  };

  // Hide navbar on login/register pages
  if (["/login", "/register", "/forgot-password"].includes(location.pathname)) {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          GScorE Assessment Tool
        </Link>

        <div className="menu-icon" onClick={toggleMenu}>
          <i className={isMenuOpen ? "fas fa-times" : "fas fa-bars"}></i>
        </div>

        <ul className={isMenuOpen ? "nav-menu active" : "nav-menu"}>
          {user ? (
            <>
              <li className="nav-item">
                <Link to="/" className="nav-link" onClick={closeMenu}>
                  Dashboard
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/assessment" className="nav-link" onClick={closeMenu}>
                  New Assessment
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/history" className="nav-link" onClick={closeMenu}>
                  History
                </Link>
              </li>
              {user.role === "admin" && (
                <li className="nav-item">
                  <Link to="/admin" className="nav-link" onClick={closeMenu}>
                    Admin
                  </Link>
                </li>
              )}
              <li className="nav-item dropdown">
                <button className="nav-link dropdown-toggle">
                  {user.name} <i className="fas fa-caret-down"></i>
                </button>
                <div className="dropdown-menu">
                  <Link
                    to="/profile"
                    className="dropdown-item"
                    onClick={closeMenu}
                  >
                    Profile
                  </Link>
                  <Link
                    to="/settings"
                    className="dropdown-item"
                    onClick={closeMenu}
                  >
                    Settings
                  </Link>
                  <div className="dropdown-divider"></div>
                  <button onClick={handleLogout} className="dropdown-item">
                    Logout
                  </button>
                </div>
              </li>
            </>
          ) : (
            <>
              <li className="nav-item">
                <Link to="/login" className="nav-link" onClick={closeMenu}>
                  Login
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/register" className="nav-link" onClick={closeMenu}>
                  Register
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
