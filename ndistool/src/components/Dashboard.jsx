// src/components/Dashboard.js
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../styles/Dashboard.css";
import NDISDashboard from "./NDISDashboard";

const API_URL = import.meta.env.VITE_APP_API_URL || "http://localhost:5000";

const Dashboard = () => {
  const [recentAssessments, setRecentAssessments] = useState([]);
  const [assessmentStats, setAssessmentStats] = useState({
    total: 0,
    completed: 0,
    pendingReview: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userInfo, setUserInfo] = useState({
    name: "",
    role: "",
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("token");

        // Fetch user info
        const userResponse = await axios.get(`${API_URL}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (userResponse.data.success) {
          setUserInfo({
            name: userResponse.data.user.name,
            role: userResponse.data.user.role,
          });
        }

        // Fetch recent assessments
        const assessmentsResponse = await axios.get(
          `${API_URL}/api/assessments/recent`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (assessmentsResponse.data.success) {
          setRecentAssessments(assessmentsResponse.data.assessments);
        }

        // Fetch assessment stats
        const statsResponse = await axios.get(
          `${API_URL}/api/assessments/stats`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (statsResponse.data.success) {
          setAssessmentStats(statsResponse.data.stats);
        }
      } catch (err) {
        setError("Failed to load dashboard data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Welcome, {userInfo.name}</h1>
        <p className="user-role">{userInfo.role}</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="dashboard-content">
        <div className="stats-cards">
          <div className="stat-card">
            <h3>Total Assessments</h3>
            <p className="stat-number">{assessmentStats.total}</p>
          </div>
          <div className="stat-card">
            <h3>Completed</h3>
            <p className="stat-number">{assessmentStats.completed}</p>
          </div>
          <div className="stat-card">
            <h3>Pending Review</h3>
            <p className="stat-number">{assessmentStats.pendingReview}</p>
          </div>
        </div>

        <div className="recent-assessments">
          <div className="section-header">
            <h2>Recent Assessments</h2>
            <Link to="/history" className="view-all-link">
              View All
            </Link>
          </div>

          {recentAssessments.length > 0 ? (
            <div className="assessments-table-container">
              <table className="assessments-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Participant</th>
                    <th>NDIS Number</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAssessments.map((assessment) => (
                    <tr key={assessment._id}>
                      <td>{formatDate(assessment.date)}</td>
                      <td>{assessment.participantDetails.fullName}</td>
                      <td>{assessment.participantDetails.ndisNumber}</td>
                      <td>{assessment.totalScore}</td>
                      <td>
                        <span
                          className={`status ${assessment.status.toLowerCase()}`}
                        >
                          {assessment.status}
                        </span>
                      </td>
                      <td>
                        <Link
                          to={`/report/${assessment._id}`}
                          className="view-btn"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-assessments">
              <p>No recent assessments found.</p>
            </div>
          )}
        </div>

        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            <Link to="/assessment" className="action-btn primary">
              New Assessment
            </Link>
            <Link to="/history" className="action-btn secondary">
              View History
            </Link>
          </div>
        </div>
      </div>
      <NDISDashboard />
    </div>
  );
};

export default Dashboard;
