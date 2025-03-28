// src/components/SupervisorDashboard.jsx
import React from "react";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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
import "../styles/SupervisorDashboard.css";

const SupervisorDashboard = ({ stats, recentAssignments }) => {
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
        return "badge-warning";
      case "accepted":
        return "badge-info";
      case "in_progress":
        return "badge-primary";
      case "completed":
        return "badge-success";
      case "cancelled":
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
    <div className="supervisor-dashboard">
      <div className="dashboard-section">
        <div className="stats-cards">
          <div className="stat-card">
            <h3>Total Participants</h3>
            <p className="stat-number">{stats?.totalParticipants || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Active Assessors</h3>
            <p className="stat-number">{stats?.activeAssessors || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Total Assignments</h3>
            <p className="stat-number">{stats?.totalAssignments || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Pending Assignments</h3>
            <p className="stat-number">{stats?.pendingAssignments || 0}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-section charts-section">
        <div className="chart-card">
          <h2>Assignment Status Distribution</h2>
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
          <h2>Assessor Performance</h2>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={stats?.assessorPerformance || []}
              margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="completedAssignments"
                fill="#0088FE"
                name="Completed"
              />
              <Bar dataKey="pendingAssignments" fill="#FFBB28" name="Pending" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="section-header">
          <h2>Recent Assignments</h2>
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
                    <td>
                      <Link to={`/participants/${assignment.participant?._id}`}>
                        {assignment.participant?.fullName || "Unknown"}
                      </Link>
                    </td>
                    <td>{assignment.assessor?.name || "Not assigned"}</td>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>No recent assignments available.</p>
            <Link to="/assignments/create" className="create-button">
              Create New Assignment
            </Link>
          </div>
        )}
      </div>

      <div className="dashboard-section">
        <div className="section-header">
          <h2>Recent Activity</h2>
        </div>
        {stats?.recentActivity && stats.recentActivity.length > 0 ? (
          <div className="activity-feed">
            {stats.recentActivity.map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-icon">
                  <i className={getActivityIcon(activity.type)}></i>
                </div>
                <div className="activity-content">
                  <div className="activity-message">{activity.message}</div>
                  <div className="activity-time">
                    {new Date(activity.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No recent activity to display.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to get icon class based on activity type
const getActivityIcon = (type) => {
  switch (type) {
    case "assignment":
      return "fas fa-tasks";
    case "assessment":
      return "fas fa-clipboard-check";
    case "participant":
      return "fas fa-user";
    case "system":
      return "fas fa-cog";
    default:
      return "fas fa-bell";
  }
};

export default SupervisorDashboard;
