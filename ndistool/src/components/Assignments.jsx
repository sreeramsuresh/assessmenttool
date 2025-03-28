// src/components/Assignments.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../styles/Assignments.css";

const API_URL = import.meta.env.VITE_APP_API_URL || "http://localhost:5000";

const Assignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    status: "",
    participant: "",
    assessor: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    const userInfo = localStorage.getItem("user");
    if (userInfo) {
      const user = JSON.parse(userInfo);
      setUserRole(user.role);
    }

    fetchAssignments();
  }, [currentPage, filters]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Build query parameters
      const params = new URLSearchParams();
      params.append("page", currentPage);
      params.append("limit", 10);

      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await axios.get(
        `${API_URL}/api/assignments?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setAssignments(response.data.assignments);
        setTotalPages(response.data.pagination.pages);
      } else {
        setError("Failed to load assignments. Please try again.");
      }
    } catch (err) {
      console.error("Error fetching assignments:", err);
      setError("An error occurred while fetching assignments.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
    setCurrentPage(1); // Reset to first page when changing filters
  };

  const resetFilters = () => {
    setFilters({
      status: "",
      participant: "",
      assessor: "",
      startDate: "",
      endDate: "",
    });
    setCurrentPage(1);
  };

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

  const handleUpdateStatus = async (assignmentId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${API_URL}/api/assignments/${assignmentId}/status`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        // Update the assignment in the local state
        setAssignments((prev) =>
          prev.map((assignment) =>
            assignment._id === assignmentId
              ? { ...assignment, status: newStatus }
              : assignment
          )
        );
      } else {
        setError("Failed to update assignment status.");
      }
    } catch (err) {
      console.error("Error updating assignment status:", err);
      setError("An error occurred while updating the assignment status.");
    }
  };

  const renderStatusActions = (assignment) => {
    const { _id, status } = assignment;

    if (userRole === "assessor") {
      if (status === "pending") {
        return (
          <>
            <button
              onClick={() => handleUpdateStatus(_id, "accepted")}
              className="status-btn accept-btn"
            >
              Accept
            </button>
            <button
              onClick={() => handleUpdateStatus(_id, "cancelled")}
              className="status-btn cancel-btn"
            >
              Decline
            </button>
          </>
        );
      } else if (status === "accepted") {
        return (
          <button
            onClick={() => handleUpdateStatus(_id, "in_progress")}
            className="status-btn progress-btn"
          >
            Start
          </button>
        );
      } else if (status === "in_progress") {
        return (
          <button
            onClick={() => handleUpdateStatus(_id, "completed")}
            className="status-btn complete-btn"
          >
            Complete
          </button>
        );
      }
    } else if (userRole === "participant") {
      if (
        (status === "accepted" || status === "in_progress") &&
        assignment.assessments.length > 0
      ) {
        // Show button to take assessment
        return (
          <Link
            to={`/take-assessment/${_id}/${assignment.assessments[0]}`}
            className="take-assessment-btn"
          >
            Take Assessment
          </Link>
        );
      }
    }

    return null;
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="pagination">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="pagination-btn"
        >
          Previous
        </button>

        <div className="pagination-info">
          Page {currentPage} of {totalPages}
        </div>

        <button
          onClick={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
          }
          disabled={currentPage === totalPages}
          className="pagination-btn"
        >
          Next
        </button>
      </div>
    );
  };

  if (loading && assignments.length === 0) {
    return <div className="loading">Loading assignments...</div>;
  }

  return (
    <div className="assignments-container">
      <div className="assignments-header">
        <h1>Assignments</h1>
        {(userRole === "supervisor" || userRole === "admin") && (
          <Link to="/assignments/create" className="create-btn">
            Create Assignment
          </Link>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="filter-section">
        <h2>Filters</h2>
        <div className="filter-form">
          <div className="filter-row">
            <div className="filter-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {(userRole === "supervisor" || userRole === "admin") && (
              <>
                <div className="filter-group">
                  <label htmlFor="assessor">Assessor</label>
                  <input
                    type="text"
                    id="assessor"
                    name="assessor"
                    value={filters.assessor}
                    onChange={handleFilterChange}
                    placeholder="Assessor name"
                  />
                </div>

                <div className="filter-group">
                  <label htmlFor="participant">Participant</label>
                  <input
                    type="text"
                    id="participant"
                    name="participant"
                    value={filters.participant}
                    onChange={handleFilterChange}
                    placeholder="Participant name or NDIS #"
                  />
                </div>
              </>
            )}
          </div>

          <div className="filter-row">
            <div className="filter-group">
              <label htmlFor="startDate">Start Date</label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
              />
            </div>

            <div className="filter-group">
              <label htmlFor="endDate">End Date</label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
              />
            </div>

            <div className="filter-actions">
              <button onClick={resetFilters} className="reset-btn">
                Reset Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {assignments.length === 0 ? (
        <div className="no-assignments">
          <p>No assignments found matching your criteria.</p>
          {userRole === "supervisor" && (
            <Link to="/assignments/create" className="create-btn-secondary">
              Create New Assignment
            </Link>
          )}
        </div>
      ) : (
        <div className="assignments-table-container">
          <table className="assignments-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Participant</th>
                {userRole !== "participant" && <th>Assessor</th>}
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment._id}>
                  <td>{assignment.title}</td>
                  <td>
                    <Link
                      to={`/participants/${assignment.participant?._id}`}
                      className="name-link"
                    >
                      {assignment.participant?.fullName || "Unknown"}
                    </Link>
                  </td>
                  {userRole !== "participant" && (
                    <td>{assignment.assessor?.name || "Not assigned"}</td>
                  )}
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
                  <td className="actions-column">
                    <Link
                      to={`/assignments/${assignment._id}`}
                      className="view-btn"
                    >
                      View
                    </Link>
                    {renderStatusActions(assignment)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {renderPagination()}
    </div>
  );
};

export default Assignments;
