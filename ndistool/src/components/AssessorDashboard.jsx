// src/components/AssessorDashboard.jsx
import React from "react";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "../styles/AssessorDashboard.css";

const AssessorDashboard = ({ stats, recentAssessments, recentAssignments }) => {
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

  const getStatusLabel = (status) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "accepted":
        return "Accepted";
      case "in_progress":
        return "In Progress";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  // Colors for charts
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  return (
    <div className="assessor-dashboard">
      <div className="dashboard-section">
        <div className="stats-cards">
          <div className="stat-card">
            <h3>Assigned Participants</h3>
            <p className="stat-number">{stats?.assignedParticipants || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Pending Assignments</h3>
            <p className="stat-number">{stats?.pendingAssignments || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Completed Assessments</h3>
            <p className="stat-number">{stats?.completedAssessments || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Assessments Due This Week</h3>
            <p className="stat-number">{stats?.dueThisWeek || 0}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-section charts-section">
        <div className="chart-card">
          <h2>Assignment Status</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats?.assignmentStatusDistribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {(stats?.assignmentStatusDistribution || []).map(
                    (entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    )
                  )}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h2>Monthly Assessments</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={stats?.monthlyAssessments || []}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="section-header">
          <h2>My Pending Assignments</h2>
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
                  <th>Participant</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentAssignments.map((assignment) => (
                  <tr key={assignment._id}>
                    <td>{assignment.title}</td>
                    <td>
                      <Link to={`/participants/${assignment.participant?._id}`}>
                        {assignment.participant?.fullName || "Unknown"}
                      </Link>
                    </td>
                    <td>{formatDate(assignment.dueDate)}</td>
                    <td>
                      <span
                        className={`status-badge ${getStatusBadgeClass(
                          assignment.status
                        )}`}
                      >
                        {getStatusLabel(assignment.status)}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/assignments/${assignment._id}`}
                        className="view-btn"
                      >
                        View
                      </Link>
                      {assignment.status === "pending" && (
                        <button
                          className="accept-btn"
                          onClick={() => handleAcceptAssignment(assignment._id)}
                        >
                          Accept
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>No pending assignments available.</p>
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
                  <th>Participant</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentAssessments.map((assessment) => (
                  <tr key={assessment._id}>
                    <td>{formatDate(assessment.date)}</td>
                    <td>
                      {assessment.participantDetails ? (
                        <Link
                          to={`/participants/${assessment.participant?._id}`}
                          className="name-link"
                        >
                          {assessment.participantDetails.fullName}
                        </Link>
                      ) : (
                        "Unknown"
                      )}
                    </td>
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
            <p>No recent assessments available.</p>
          </div>
        )}
      </div>

      <div className="dashboard-section">
        <div className="assigned-participants">
          <div className="section-header">
            <h2>My Assigned Participants</h2>
            <Link to="/participants" className="view-all-link">
              View All
            </Link>
          </div>
          {stats?.assignedParticipantsList &&
          stats.assignedParticipantsList.length > 0 ? (
            <div className="participants-grid">
              {stats.assignedParticipantsList.map((participant) => (
                <div key={participant._id} className="participant-card">
                  <div className="participant-info">
                    <h3>{participant.fullName}</h3>
                    <p className="ndis-number">
                      NDIS: {participant.ndisNumber}
                    </p>
                    <p className="last-assessment">
                      Last Assessment:{" "}
                      {participant.lastAssessmentDate
                        ? formatDate(participant.lastAssessmentDate)
                        : "None"}
                    </p>
                  </div>
                  <div className="participant-actions">
                    <Link
                      to={`/participants/${participant._id}`}
                      className="profile-btn"
                    >
                      View Profile
                    </Link>
                    <Link
                      to={`/assessment/new/${participant._id}`}
                      className="assess-btn"
                    >
                      New Assessment
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No participants assigned to you yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssessorDashboard;
