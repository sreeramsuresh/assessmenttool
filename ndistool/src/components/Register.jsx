// src/components/Register.js
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "../styles/Register.css";

const API_URL = import.meta.env.VITE_APP_API_URL || "http://localhost:5000";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    organization: "",
    position: "",
    role: "assessor", // Default role
    // Participant-specific fields
    ndisNumber: "",
    dateOfBirth: "",
    contactNumber: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [isParticipant, setIsParticipant] = useState(false);
  const navigate = useNavigate();

  // Add auth-page class to body when component mounts
  useEffect(() => {
    document.body.classList.add("auth-page");

    // Remove auth-page class when component unmounts
    return () => {
      document.body.classList.remove("auth-page");
    };
  }, []);

  const {
    name,
    email,
    password,
    confirmPassword,
    organization,
    position,
    role,
    ndisNumber,
    dateOfBirth,
    contactNumber,
    address,
  } = formData;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });

    // Clear field-specific error when user starts typing
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }

    // Clear general error
    if (error) setError("");
  };

  const handleRoleChange = (e) => {
    const selectedRole = e.target.value;
    setFormData({ ...formData, role: selectedRole });
    setIsParticipant(selectedRole === "participant");
  };

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    // Email validation
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      newErrors.email = "Email is invalid";
    }

    // Password validation
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    } else if (!/(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/.test(password)) {
      newErrors.password =
        "Password must contain at least one number, one lowercase and one uppercase letter";
    }

    // Confirm password validation
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Organization validation (not needed for participants)
    if (!isParticipant && !organization.trim()) {
      newErrors.organization = "Organization is required";
    }

    // Participant-specific validations
    if (isParticipant) {
      if (!ndisNumber.trim()) {
        newErrors.ndisNumber = "NDIS number is required";
      }
      if (!dateOfBirth) {
        newErrors.dateOfBirth = "Date of birth is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError("");

    // Remove confirmPassword from the data to be sent to the server
    const { confirmPassword, ...registrationData } = formData;

    try {
      const response = await axios.post(
        `${API_URL}/api/auth/register`,
        registrationData
      );

      if (response.data.success) {
        // Store token in localStorage
        localStorage.setItem("token", response.data.token);

        // Store user info for easy access
        localStorage.setItem("user", JSON.stringify(response.data.user));

        // Redirect to dashboard
        navigate("/");
      } else {
        setError(
          response.data.message || "Registration failed. Please try again."
        );
      }
    } catch (err) {
      // Handle validation errors from server
      if (err.response && err.response.data && err.response.data.errors) {
        setErrors(err.response.data.errors);
      } else {
        setError(
          err.response?.data?.message ||
            "An error occurred during registration. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <div className="auth-logo">
            <span className="gig">Gig</span>
            <span className="labz">Labz</span>
          </div>
          <p>Create a new account</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={name}
              onChange={handleChange}
              placeholder="Enter your full name"
              className={errors.name ? "error" : ""}
            />
            {errors.name && <div className="field-error">{errors.name}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={handleChange}
              placeholder="Enter your email"
              className={errors.email ? "error" : ""}
            />
            {errors.email && <div className="field-error">{errors.email}</div>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={handleChange}
                placeholder="Create a password"
                className={errors.password ? "error" : ""}
              />
              {errors.password && (
                <div className="field-error">{errors.password}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                className={errors.confirmPassword ? "error" : ""}
              />
              {errors.confirmPassword && (
                <div className="field-error">{errors.confirmPassword}</div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="role">Account Type</label>
            <select
              id="role"
              name="role"
              value={role}
              onChange={handleRoleChange}
              className={errors.role ? "error" : ""}
            >
              <option value="assessor">Assessor</option>
              <option value="supervisor">Supervisor</option>
              <option value="participant">Participant</option>
            </select>
            {errors.role && <div className="field-error">{errors.role}</div>}
          </div>

          {!isParticipant && (
            <>
              <div className="form-group">
                <label htmlFor="organization">Organization</label>
                <input
                  type="text"
                  id="organization"
                  name="organization"
                  value={organization}
                  onChange={handleChange}
                  placeholder="Enter your organization"
                  className={errors.organization ? "error" : ""}
                />
                {errors.organization && (
                  <div className="field-error">{errors.organization}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="position">Position</label>
                <input
                  type="text"
                  id="position"
                  name="position"
                  value={position}
                  onChange={handleChange}
                  placeholder="Enter your position (optional)"
                />
              </div>
            </>
          )}

          {isParticipant && (
            <div className="participant-fields">
              <div className="form-group">
                <label htmlFor="ndisNumber">NDIS Number</label>
                <input
                  type="text"
                  id="ndisNumber"
                  name="ndisNumber"
                  value={ndisNumber}
                  onChange={handleChange}
                  placeholder="Enter your NDIS number"
                  className={errors.ndisNumber ? "error" : ""}
                />
                {errors.ndisNumber && (
                  <div className="field-error">{errors.ndisNumber}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="dateOfBirth">Date of Birth</label>
                <input
                  type="date"
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={dateOfBirth}
                  onChange={handleChange}
                  className={errors.dateOfBirth ? "error" : ""}
                />
                {errors.dateOfBirth && (
                  <div className="field-error">{errors.dateOfBirth}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="contactNumber">Contact Number</label>
                <input
                  type="tel"
                  id="contactNumber"
                  name="contactNumber"
                  value={contactNumber}
                  onChange={handleChange}
                  placeholder="Enter your contact number"
                />
              </div>

              <div className="form-group">
                <label htmlFor="address">Address</label>
                <textarea
                  id="address"
                  name="address"
                  value={address}
                  onChange={handleChange}
                  placeholder="Enter your address"
                  rows="3"
                ></textarea>
              </div>
            </div>
          )}

          <button type="submit" className="register-button" disabled={loading}>
            {loading ? "Registering..." : "Create Account"}
          </button>
        </form>

        <div className="register-footer">
          <p>
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
