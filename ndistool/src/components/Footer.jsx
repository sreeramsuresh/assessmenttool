// src/components/Footer.jsx
import React from "react";
import "../styles/Footer.css";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-logo">
            <span>Powered by</span>
            <span className="logo-text">
              <span className="gig">Gig</span>
              <span className="labz">Labz</span>
            </span>
          </div>
          <div className="footer-links">
            <a href="/terms" className="footer-link">
              Terms of Use
            </a>
            <a href="/privacy" className="footer-link">
              Privacy Policy
            </a>
            <span className="copyright">
              © {currentYear} GigLabz - All Rights Reserved
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
