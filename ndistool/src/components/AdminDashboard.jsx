// src/components/AdminDashboard.jsx
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
import "../styles/AdminDashboard.css";

const AdminDashboard = ({ stats }) => {
  // Colors for charts
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  return (
    <div className="admin-dashboard">
      <div className="dashboard-section">
        <div className="stats-cards">
          <div className="stat-card">
            <h3>Total Users</h3>
            <p className="stat-number">{stats?.totalUsers || 0}</p>
            <div className="stat-breakdown">
              <div className="stat-item">
                <span className="stat-label">Assessors:</span>
                <span className="stat-value">
                  {stats?.userRoles?.assessor || 0}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Supervisors:</span>
                <span className="stat-value">
                  {stats?.userRoles?.supervisor || 0}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Participants:</span>
                <span className="stat-value">
                  {stats?.userRoles?.participant || 0}
                </span>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <h3>Total Assessments</h3>
            <p className="stat-number">{stats?.totalAssessments || 0}</p>
            <div className="stat-breakdown">
              <div className="stat-item">
                <span className="stat-label">Completed:</span>
                <span className="stat-value">
                  {stats?.assessmentStatus?.completed || 0}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">In Progress:</span>
                <span className="stat-value">
                  {stats?.assessmentStatus?.inProgress || 0}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Pending Review:</span>
                <span className="stat-value">
                  {stats?.assessmentStatus?.pendingReview || 0}
                </span>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <h3>Total Assignments</h3>
            <p className="stat-number">{stats?.totalAssignments || 0}</p>
            <div className="stat-breakdown">
              <div className="stat-item">
                <span className="stat-label">Pending:</span>
                <span className="stat-value">
                  {stats?.assignmentStatus?.pending || 0}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">In Progress:</span>
                <span className="stat-value">
                  {stats?.assignmentStatus?.inProgress || 0}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Completed:</span>
                <span className="stat-value">
                  {stats?.assignmentStatus?.completed || 0}
                </span>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <h3>System Stats</h3>
            <div className="stat-breakdown">
              <div className="stat-item">
                <span className="stat-label">Custom Questions:</span>
                <span className="stat-value">
                  {stats?.customQuestions || 0}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Active Sections:</span>
                <span className="stat-value">{stats?.activeSections || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">System Uptime:</span>
                <span className="stat-value">{stats?.uptime || "N/A"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-section charts-section">
        <div className="chart-card">
          <h2>User Distribution</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    {
                      name: "Assessors",
                      value: stats?.userRoles?.assessor || 0,
                    },
                    {
                      name: "Supervisors",
                      value: stats?.userRoles?.supervisor || 0,
                    },
                    {
                      name: "Participants",
                      value: stats?.userRoles?.participant || 0,
                    },
                    { name: "Admins", value: stats?.userRoles?.admin || 0 },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {[
                    {
                      name: "Assessors",
                      value: stats?.userRoles?.assessor || 0,
                    },
                    {
                      name: "Supervisors",
                      value: stats?.userRoles?.supervisor || 0,
                    },
                    {
                      name: "Participants",
                      value: stats?.userRoles?.participant || 0,
                    },
                    { name: "Admins", value: stats?.userRoles?.admin || 0 },
                  ].map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h2>Monthly Activity</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={stats?.monthlyActivity || []}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="assessments"
                  stroke="#8884d8"
                  name="Assessments"
                  activeDot={{ r: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="assignments"
                  stroke="#82ca9d"
                  name="Assignments"
                />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#ffc658"
                  name="New Users"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="dashboard-section">
        <h2>Organization Performance</h2>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={stats?.organizationPerformance || []}
              margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={70}
                interval={0}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="assessments" name="Assessments" fill="#8884d8" />
              <Bar dataKey="participants" name="Participants" fill="#82ca9d" />
              <Bar dataKey="assessors" name="Assessors" fill="#ffc658" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="admin-actions">
          <h2>Administrative Actions</h2>
          <div className="admin-cards">
            <div className="admin-card">
              <h3>User Management</h3>
              <p>Create, edit, and manage user accounts and permissions.</p>
              <Link to="/admin/users" className="admin-btn">
                Manage Users
              </Link>
            </div>
            <div className="admin-card">
              <h3>Assessment Sections</h3>
              <p>Configure assessment sections and questions templates.</p>
              <Link to="/admin/sections" className="admin-btn">
                Manage Sections
              </Link>
            </div>
            <div className="admin-card">
              <h3>System Settings</h3>
              <p>Configure system settings and global parameters.</p>
              <Link to="/admin/settings" className="admin-btn">
                System Settings
              </Link>
            </div>
            <div className="admin-card">
              <h3>Reports & Analytics</h3>
              <p>Generate detailed system and performance reports.</p>
              <Link to="/admin/reports" className="admin-btn">
                View Reports
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="system-status">
          <h2>System Status</h2>
          <div className="status-grid">
            <div className="status-item">
              <div className="status-label">API Service</div>
              <div className="status-value">
                <span className="status-indicator online"></span> Online
              </div>
            </div>
            <div className="status-item">
              <div className="status-label">Database</div>
              <div className="status-value">
                <span className="status-indicator online"></span> Connected
              </div>
            </div>
            <div className="status-item">
              <div className="status-label">Storage</div>
              <div className="status-value">
                <span className="status-indicator warning"></span> 78% Full
              </div>
            </div>
            <div className="status-item">
              <div className="status-label">Last Backup</div>
              <div className="status-value">Today @ 03:00 AM</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
