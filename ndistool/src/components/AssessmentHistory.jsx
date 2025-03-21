// src/components/AssessmentHistory.js
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../styles/AssessmentHistory.css";

const API_URL = import.meta.env.VITE_APP_API_URL || "http://localhost:5000";

const AssessmentHistory = () => {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    status: "",
    participantId: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    fetchAssessments();
  }, [currentPage, filters]);

  const fetchAssessments = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append("page", currentPage);
      queryParams.append("limit", 10);

      if (filters.status) {
        queryParams.append("status", filters.status);
      }

      if (filters.participantId) {
        queryParams.append("participantId", filters.participantId);
      }

      if (filters.startDate) {
        queryParams.append("startDate", filters.startDate);
      }

      if (filters.endDate) {
        queryParams.append("endDate", filters.endDate);
      }

      const response = await axios.get(
        `${API_URL}/api/assessments?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setAssessments(response.data.assessments);
        setTotalPages(response.data.pagination.pages);
      } else {
        setError("Failed to load assessments. Please try again.");
      }
    } catch (err) {
      setError("An error occurred while fetching assessments.");
      console.error(err);
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

    // Reset to first page when changing filters
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      status: "",
      participantId: "",
      startDate: "",
      endDate: "",
    });
    setCurrentPage(1);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Completed":
        return "badge-success";
      case "Pending Review":
        return "badge-warning";
      case "Reviewed":
        return "badge-info";
      default:
        return "";
    }
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

  if (loading && assessments.length === 0) {
    return <div className="loading">Loading assessments...</div>;
  }

  return (
    <div className="assessment-history">
      <div className="history-header">
        <h1>Assessment History</h1>
        <Link to="/assessment" className="new-assessment-btn">
          New Assessment
        </Link>
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
                <option value="Completed">Completed</option>
                <option value="Pending Review">Pending Review</option>
                <option value="Reviewed">Reviewed</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="participantId">NDIS Number</label>
              <input
                type="text"
                id="participantId"
                name="participantId"
                value={filters.participantId}
                onChange={handleFilterChange}
                placeholder="Enter NDIS number"
              />
            </div>
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

      {assessments.length === 0 ? (
        <div className="no-assessments">
          <p>No assessments found matching your filters.</p>
        </div>
      ) : (
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
              {assessments.map((assessment) => (
                <tr key={assessment._id}>
                  <td>{formatDate(assessment.date)}</td>
                  <td>{assessment.participantDetails.fullName}</td>
                  <td>{assessment.participantDetails.ndisNumber}</td>
                  <td>{assessment.totalScore}</td>
                  <td>
                    <span
                      className={`status-badge ${getStatusBadgeClass(
                        assessment.status
                      )}`}
                    >
                      {assessment.status}
                    </span>
                  </td>
                  <td className="action-buttons">
                    <Link to={`/report/${assessment._id}`} className="view-btn">
                      View
                    </Link>
                    {assessment.status === "Completed" && (
                      <button className="review-btn">Mark for Review</button>
                    )}
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

export default AssessmentHistory;
