// src/components/ParticipantDashboard.jsx
import React from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "../styles/ParticipantDashboard.css";

const ParticipantDashboard = ({
  stats,
  recentAssessments,
  recentAssignments,
}) => {
  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "pending":
      case "Pending":
      case "Pending Review":
        return "badge-warning";
      case "accepted":
      case "Accepted":
      case "In Progress":
        return "badge-info";
      case "completed":
      case "Completed":
        return "badge-success";
      case "cancelled":
      case "Cancelled":
        return "badge-danger";
      default:
        return "";
    }
  };

  // Example assessment data for charts (would come from API in real implementation)
  const prepareChartData = () => {
    if (!stats || !stats.sectionScores) {
      return [];
    }

    return Object.entries(stats.sectionScores).map(([section, score]) => ({
      name: section,
      score: score,
    }));
  };

  return (
    <div className="participant-dashboard">
      <div className="dashboard-section">
        <div className="stats-cards">
          <div className="stat-card">
            <h3>Completed Assessments</h3>
            <p className="stat-number">{stats?.assessmentsCompleted || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Pending Assignments</h3>
            <p className="stat-number">{stats?.pendingAssignments || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Latest Score</h3>
            <p className="stat-number">{stats?.latestScore || "N/A"}</p>
          </div>
        </div>
      </div>

      {stats?.sectionScores && (
        <div className="dashboard-section">
          <h2>Assessment Strengths Summary</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={prepareChartData()}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Legend />
                <Bar
                  name="Section Score (Lower is Better)"
                  dataKey="score"
                  fill="#3498db"
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="dashboard-section">
        <div className="section-header">
          <h2>Pending Assignments</h2>
          <Link to="/assignments" className="view-all-link">
            View All
          </Link>
        </div>
        {recentAssignments && recentAssignments.length > 0 ? (
          <div className="assignments-table-container">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Assessor</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentAssignments.map((assignment) => (
                  <tr key={assignment._id}>
                    <td>{assignment.title}</td>
                    <td>{assignment.assessor?.name || "Not assigned"}</td>
                    <td>{formatDate(assignment.dueDate)}</td>
                    <td>
                      <span
                        className={`status-badge ${getStatusBadgeClass(
                          assignment.status
                        )}`}
                      >
                        {assignment.status}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link
                          to={`/assignments/${assignment._id}`}
                          className="view-btn"
                        >
                          View
                        </Link>
                        {assignment.status === "in_progress" &&
                          assignment.assessments?.length > 0 && (
                            <Link
                              to={`/take-assessment/${assignment._id}/${assignment.assessments[0]}`}
                              className="action-btn"
                            >
                              Take Assessment
                            </Link>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>No pending assignments at the moment.</p>
          </div>
        )}
      </div>

      <div className="dashboard-section">
        <div className="section-header">
          <h2>Recent Assessments</h2>
          <Link to="/history" className="view-all-link">
            View All
          </Link>
        </div>
        {recentAssessments && recentAssessments.length > 0 ? (
          <div className="assessments-table-container">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentAssessments.map((assessment) => (
                  <tr key={assessment._id}>
                    <td>{formatDate(assessment.date)}</td>
                    <td>{assessment.totalScore || "In progress"}</td>
                    <td>
                      <span
                        className={`status-badge ${getStatusBadgeClass(
                          assessment.status
                        )}`}
                      >
                        {assessment.status}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/report/${assessment._id}`}
                        className="view-btn"
                      >
                        View Report
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>No assessments have been completed yet.</p>
          </div>
        )}
      </div>

      <div className="dashboard-section">
        <div className="resource-links">
          <h2>Helpful Resources</h2>
          <div className="resource-cards">
            <div className="resource-card">
              <h3>NDIS Participant Guide</h3>
              <p>
                Learn about your rights and responsibilities as an NDIS
                participant.
              </p>
              <a
                href="https://www.ndis.gov.au/participants"
                target="_blank"
                rel="noopener noreferrer"
                className="resource-link"
              >
                View Guide
              </a>
            </div>
            <div className="resource-card">
              <h3>Understanding Your Assessment</h3>
              <p>
                Information about how the strength-based assessment process
                works.
              </p>
              <a href="#" className="resource-link">
                Learn More
              </a>
            </div>
            <div className="resource-card">
              <h3>Support Services</h3>
              <p>
                Find additional support services available to NDIS participants.
              </p>
              <a href="#" className="resource-link">
                Find Services
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantDashboard;
