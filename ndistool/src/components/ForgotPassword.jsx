// src/components/ForgotPassword.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../styles/ForgotPassword.css";

const API_URL = import.meta.env.VITE_APP_API_URL || "http://localhost:5000";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.post(`${API_URL}/api/auth/forgot-password`, {
        email,
      });

      if (response.data.success) {
        setSuccess(true);
      } else {
        setError(
          response.data.message ||
            "Failed to process your request. Please try again."
        );
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "An error occurred. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <div className="forgot-password-header">
          <h1>NDIS Assessment Tool</h1>
          <p>Reset Your Password</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {success ? (
          <div className="success-container">
            <div className="success-message">
              We've sent a password reset link to your email. Please check your
              inbox and follow the instructions to reset your password.
            </div>
            <div className="back-to-login">
              <Link to="/login">Back to Login</Link>
            </div>
          </div>
        ) : (
          <>
            <p className="instructions">
              Enter your email address and we'll send you a link to reset your
              password.
            </p>

            <form onSubmit={handleSubmit} className="forgot-password-form">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                />
              </div>

              <button
                type="submit"
                className="submit-button"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>

            <div className="forgot-password-footer">
              <p>
                Remember your password? <Link to="/login">Login</Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
