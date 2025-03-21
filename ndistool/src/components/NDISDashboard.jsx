import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import "../styles/NDISDashboard.css";

const NDISDashboard = () => {
  const [assessmentData, setAssessmentData] = useState({
    monthlyStats: [],
    statusDistribution: [],
    sectionAverages: [],
  });
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState({
    name: "John Smith",
    role: "Assessor",
    organization: "NDIS Support Services",
  });

  // Mock data for demonstration
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const mockMonthlyData = [
        { month: "Jan", assessments: 12 },
        { month: "Feb", assessments: 19 },
        { month: "Mar", assessments: 15 },
        { month: "Apr", assessments: 22 },
        { month: "May", assessments: 28 },
        { month: "Jun", assessments: 24 },
      ];

      const mockStatusData = [
        { name: "Completed", value: 45 },
        { name: "Pending Review", value: 15 },
        { name: "Reviewed", value: 30 },
      ];

      const mockSectionData = [
        { name: "Personal Care", average: 2.4 },
        { name: "Mobility", average: 3.1 },
        { name: "Communication", average: 2.7 },
        { name: "Learning", average: 3.5 },
        { name: "Health", average: 2.9 },
        { name: "Safety", average: 2.3 },
      ];

      setAssessmentData({
        monthlyStats: mockMonthlyData,
        statusDistribution: mockStatusData,
        sectionAverages: mockSectionData,
      });

      setLoading(false);
    }, 1000);
  }, []);

  // Colors for the charts
  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884d8",
    "#82ca9d",
  ];

  // Format for the tooltip display
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{`${label}`}</p>
          <p className="tooltip-content">{`${payload[0].name}: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  // Status color mapping
  const getStatusColor = (status) => {
    const statusColors = {
      Completed: "#00C49F",
      "Pending Review": "#FFBB28",
      Reviewed: "#0088FE",
    };
    return statusColors[status] || "#999";
  };

  // Score color mapping
  const getScoreColor = (score) => {
    if (score <= 2) return "#00C49F"; // Green - Strong
    if (score <= 3) return "#FFBB28"; // Yellow - Moderate
    return "#FF8042"; // Orange - Needs Support
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-text">Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">NDIS Assessment Dashboard</h1>
        <div className="user-info">
          <span className="user-name">{userInfo.name}</span>
          <span className="user-role">{userInfo.role}</span>
          <span className="user-organization">{userInfo.organization}</span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stats-card">
          <h2 className="card-title">Assessment Stats</h2>
          <div className="stats-grid-inner">
            <div className="stat-box stat-box-blue">
              <div className="stat-value">90</div>
              <div className="stat-label">Total</div>
            </div>
            <div className="stat-box stat-box-green">
              <div className="stat-value">45</div>
              <div className="stat-label">Completed</div>
            </div>
            <div className="stat-box stat-box-yellow">
              <div className="stat-value">15</div>
              <div className="stat-label">Pending</div>
            </div>
          </div>
        </div>

        <div className="stats-card">
          <h2 className="card-title">Status Distribution</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assessmentData.statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {assessmentData.statusDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getStatusColor(entry.name)}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="stats-card">
          <h2 className="card-title">Recent Activity</h2>
          <div className="activity-list">
            <div className="activity-item activity-blue">
              <div className="activity-dot"></div>
              <div className="activity-text">New assessment completed</div>
              <div className="activity-date">Today</div>
            </div>
            <div className="activity-item activity-green">
              <div className="activity-dot"></div>
              <div className="activity-text">2 assessments reviewed</div>
              <div className="activity-date">Yesterday</div>
            </div>
            <div className="activity-item activity-yellow">
              <div className="activity-dot"></div>
              <div className="activity-text">3 assessments pending review</div>
              <div className="activity-date">2 days ago</div>
            </div>
            <div className="activity-item activity-purple">
              <div className="activity-dot"></div>
              <div className="activity-text">System update completed</div>
              <div className="activity-date">3 days ago</div>
            </div>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="stats-card">
          <h2 className="card-title">Monthly Assessments</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={assessmentData.monthlyStats}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="assessments"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                  name="Assessments"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="stats-card">
          <h2 className="card-title">Section Averages</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={assessmentData.sectionAverages}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" name="Average Score" fill="#8884d8">
                  {assessmentData.sectionAverages.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getScoreColor(entry.average)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="stats-card">
        <div className="table-header">
          <h2 className="card-title">Recent Assessments</h2>
          <button className="view-all-button">View All</button>
        </div>
        <div className="table-container">
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
              <tr>
                <td>15/03/2025</td>
                <td className="participant-name">Jane Smith</td>
                <td>NDIS12345</td>
                <td>72</td>
                <td>
                  <span className="status-badge status-completed">
                    Completed
                  </span>
                </td>
                <td>
                  <button className="action-button">View</button>
                  <button className="action-button">Edit</button>
                </td>
              </tr>
              <tr>
                <td>14/03/2025</td>
                <td className="participant-name">John Davis</td>
                <td>NDIS67890</td>
                <td>85</td>
                <td>
                  <span className="status-badge status-pending">
                    Pending Review
                  </span>
                </td>
                <td>
                  <button className="action-button">View</button>
                  <button className="action-button">Edit</button>
                </td>
              </tr>
              <tr>
                <td>13/03/2025</td>
                <td className="participant-name">Sarah Johnson</td>
                <td>NDIS54321</td>
                <td>64</td>
                <td>
                  <span className="status-badge status-reviewed">Reviewed</span>
                </td>
                <td>
                  <button className="action-button">View</button>
                  <button className="action-button">Edit</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default NDISDashboard;
