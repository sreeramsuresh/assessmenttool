// src/components/ResetPassword.jsx
import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/ResetPassword.css";

const API_URL = import.meta.env.VITE_APP_API_URL || "http://localhost:5000";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  // Add auth-page class to body when component mounts
  useEffect(() => {
    document.body.classList.add("auth-page");

    // Remove auth-page class when component unmounts
    return () => {
      document.body.classList.remove("auth-page");
    };
  }, []);

  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/api/auth/reset-password/${token}`
        );
        if (response.data.success) {
          setTokenValid(true);
        } else {
          setError(
            "Invalid or expired reset token. Please request a new password reset link."
          );
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Invalid or expired reset token. Please request a new password reset link."
        );
      } finally {
        setValidatingToken(false);
      }
    };

    validateToken();
  }, [token]);

  const { password, confirmPassword } = formData;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate passwords
    if (!password) {
      setError("Password is required");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.post(
        `${API_URL}/api/auth/reset-password/${token}`,
        {
          password,
        }
      );

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } else {
        setError(
          response.data.message || "Failed to reset password. Please try again."
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

  if (validatingToken) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="reset-password-header">
            <div className="auth-logo">
              <span className="gig">Gig</span>
              <span className="labz">Labz</span>
            </div>
            <p>Reset Your Password</p>
          </div>
          <div className="loading-message">Validating your reset link...</div>
        </div>
      </div>
    );
  }

  if (!tokenValid && !validatingToken) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="reset-password-header">
            <div className="auth-logo">
              <span className="gig">Gig</span>
              <span className="labz">Labz</span>
            </div>
            <p>Reset Your Password</p>
          </div>
          <div className="error-container">
            <div className="error-message">
              {error ||
                "Invalid or expired reset token. Please request a new password reset link."}
            </div>
            <div className="action-links">
              <Link to="/forgot-password" className="request-link">
                Request New Reset Link
              </Link>
              <Link to="/login" className="login-link">
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-container">
      <div className="reset-password-card">
        <div className="reset-password-header">
          <div className="auth-logo">
            <span className="gig">Gig</span>
            <span className="labz">Labz</span>
          </div>
          <p>Reset Your Password</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {success ? (
          <div className="success-container">
            <div className="success-message">
              Your password has been successfully reset. You will be redirected
              to the login page in a few seconds.
            </div>
            <div className="login-now">
              <Link to="/login">Login Now</Link>
            </div>
          </div>
        ) : (
          <>
            <p className="instructions">
              Please enter your new password below.
            </p>

            <form onSubmit={handleSubmit} className="reset-password-form">
              <div className="form-group">
                <label htmlFor="password">New Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={password}
                  onChange={handleChange}
                  minLength="6"
                  placeholder="Enter new password"
                />
                <small className="password-hint">
                  Password must be at least 6 characters long
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={handleChange}
                  minLength="6"
                  placeholder="Confirm new password"
                />
              </div>

              <button
                type="submit"
                className="submit-button"
                disabled={loading}
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>

            <div className="reset-password-footer">
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

export default ResetPassword;
