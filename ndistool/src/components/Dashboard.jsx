// src/components/Dashboard.js
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../styles/Dashboard.css";
import NDISDashboard from "./NDISDashboard";
import AdminDashboard from "./AdminDashboard";
import ParticipantDashboard from "./ParticipantDashboard";
import SupervisorDashboard from "./SupervisorDashboard";
import AssessorDashboard from "./AssessorDashboard";

const API_URL = import.meta.env.VITE_APP_API_URL || "http://localhost:5000";

const Dashboard = () => {
  const [recentAssessments, setRecentAssessments] = useState([]);
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({});
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

          // Fetch dashboard data from the backend
          const dashboardResponse = await axios.get(
            `${API_URL}/api/dashboard`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (dashboardResponse.data.success) {
            // Set dashboard statistics and recent items
            setDashboardStats(dashboardResponse.data.stats);

            if (dashboardResponse.data.recentAssessments) {
              setRecentAssessments(dashboardResponse.data.recentAssessments);
            }

            if (dashboardResponse.data.recentAssignments) {
              setRecentAssignments(dashboardResponse.data.recentAssignments);
            }
          }
        }
      } catch (err) {
        setError("Failed to load dashboard data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const renderRoleDashboard = () => {
    switch (userInfo.role) {
      case "admin":
        return <AdminDashboard stats={dashboardStats} />;
      case "supervisor":
        return (
          <SupervisorDashboard
            stats={dashboardStats}
            recentAssignments={recentAssignments}
          />
        );
      case "assessor":
        return (
          <AssessorDashboard
            stats={dashboardStats}
            recentAssessments={recentAssessments}
            recentAssignments={recentAssignments}
          />
        );
      case "participant":
        return (
          <ParticipantDashboard
            stats={dashboardStats}
            recentAssessments={recentAssessments}
            recentAssignments={recentAssignments}
          />
        );
      default:
        return <NDISDashboard />; // Fallback to the default dashboard
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Welcome, {userInfo.name}</h1>
        <p className="user-role">
          {userInfo.role.charAt(0).toUpperCase() + userInfo.role.slice(1)}
        </p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="dashboard-content">
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            {userInfo.role === "participant" ? (
              <Link to="/assignments" className="action-btn primary">
                My Assignments
              </Link>
            ) : userInfo.role === "assessor" ? (
              <>
                <Link to="/assessment" className="action-btn primary">
                  New Assessment
                </Link>
                <Link to="/assignments" className="action-btn secondary">
                  My Assignments
                </Link>
              </>
            ) : userInfo.role === "supervisor" ? (
              <>
                <Link to="/assignments/create" className="action-btn primary">
                  Create Assignment
                </Link>
                <Link to="/participants" className="action-btn secondary">
                  Manage Participants
                </Link>
              </>
            ) : (
              // Admin actions
              <>
                <Link to="/admin" className="action-btn primary">
                  Admin Dashboard
                </Link>
                <Link to="/admin/users" className="action-btn secondary">
                  Manage Users
                </Link>
              </>
            )}
          </div>
        </div>

        {renderRoleDashboard()}
      </div>
    </div>
  );
};

export default Dashboard;
