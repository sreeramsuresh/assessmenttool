// src/components/ConditionalFooter.jsx
import React from "react";
import { useLocation } from "react-router-dom";
import Footer from "./Footer";

const ConditionalFooter = () => {
  const location = useLocation();

  // Hide footer on login, register, forgot password, and reset password pages
  const authRoutes = ["/login", "/register", "/forgot-password"];

  // Also hide on reset-password route (which has a token parameter)
  const isResetPasswordRoute = location.pathname.startsWith("/reset-password/");

  // Show footer only if we're not on an auth route
  if (authRoutes.includes(location.pathname) || isResetPasswordRoute) {
    return null;
  }

  return <Footer />;
};

export default ConditionalFooter;
