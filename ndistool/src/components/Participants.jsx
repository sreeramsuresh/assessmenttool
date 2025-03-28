// src/components/Participants.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../styles/Participants.css";

const API_URL = import.meta.env.REACT_APP_API_URL || "http://localhost:5000";

const Participants = () => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newParticipant, setNewParticipant] = useState({
    fullName: "",
    ndisNumber: "",
    dateOfBirth: "",
    contactNumber: "",
    email: "",
    address: "",
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchParticipants();
  }, [currentPage, searchTerm]);

  const fetchParticipants = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      // Build query parameters
      const params = new URLSearchParams();
      params.append("page", currentPage);
      params.append("limit", 10);

      if (searchTerm) {
        params.append("search", searchTerm);
      }

      const response = await axios.get(
        `${API_URL}/api/participants?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setParticipants(response.data.participants);
        setTotalPages(response.data.pagination.pages);
      } else {
        setError("Failed to load participants. Please try again.");
      }
    } catch (err) {
      console.error("Error fetching participants:", err);
      setError("An error occurred while fetching participants.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddParticipant = async (e) => {
    e.preventDefault();

    // Basic validation
    const errors = {};
    if (!newParticipant.fullName.trim()) errors.fullName = "Name is required";
    if (!newParticipant.ndisNumber.trim())
      errors.ndisNumber = "NDIS number is required";
    if (!newParticipant.dateOfBirth)
      errors.dateOfBirth = "Date of birth is required";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${API_URL}/api/participants`,
        newParticipant,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        // Reset form and close modal
        setNewParticipant({
          fullName: "",
          ndisNumber: "",
          dateOfBirth: "",
          contactNumber: "",
          email: "",
          address: "",
        });
        setFormErrors({});
        setShowAddModal(false);

        // Refresh participants list
        fetchParticipants();
      } else {
        setError(response.data.message || "Failed to add participant");
      }
    } catch (err) {
      console.error("Error adding participant:", err);
      setError("An error occurred while adding the participant.");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewParticipant((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when searching
    fetchParticipants();
  };

  const clearSearch = () => {
    setSearchTerm("");
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

  const calculateAge = (dateOfBirth) => {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
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

  const renderAddParticipantModal = () => {
    if (!showAddModal) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Add New Participant</h2>
            <button
              className="close-btn"
              onClick={() => setShowAddModal(false)}
            >
              &times;
            </button>
          </div>

          <form onSubmit={handleAddParticipant} className="participant-form">
            <div className="form-group">
              <label htmlFor="fullName">Full Name*</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={newParticipant.fullName}
                onChange={handleInputChange}
                className={formErrors.fullName ? "error" : ""}
              />
              {formErrors.fullName && (
                <div className="error-message">{formErrors.fullName}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="ndisNumber">NDIS Number*</label>
              <input
                type="text"
                id="ndisNumber"
                name="ndisNumber"
                value={newParticipant.ndisNumber}
                onChange={handleInputChange}
                className={formErrors.ndisNumber ? "error" : ""}
              />
              {formErrors.ndisNumber && (
                <div className="error-message">{formErrors.ndisNumber}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="dateOfBirth">Date of Birth*</label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={newParticipant.dateOfBirth}
                onChange={handleInputChange}
                className={formErrors.dateOfBirth ? "error" : ""}
              />
              {formErrors.dateOfBirth && (
                <div className="error-message">{formErrors.dateOfBirth}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="contactNumber">Contact Number</label>
              <input
                type="tel"
                id="contactNumber"
                name="contactNumber"
                value={newParticipant.contactNumber}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={newParticipant.email}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="address">Address</label>
              <textarea
                id="address"
                name="address"
                value={newParticipant.address}
                onChange={handleInputChange}
                rows="3"
              />
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="submit-btn">
                Add Participant
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading && participants.length === 0) {
    return <div className="loading">Loading participants...</div>;
  }

  return (
    <div className="participants-container">
      <div className="participants-header">
        <h1>NDIS Participants</h1>
        <button
          className="add-participant-btn"
          onClick={() => setShowAddModal(true)}
        >
          Add New Participant
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search by name or NDIS number"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-btn">
            Search
          </button>
          {searchTerm && (
            <button type="button" className="clear-btn" onClick={clearSearch}>
              Clear
            </button>
          )}
        </form>
      </div>

      {participants.length === 0 ? (
        <div className="no-participants">
          <p>
            No participants found{" "}
            {searchTerm && "matching your search criteria"}.
          </p>
        </div>
      ) : (
        <div className="participants-table-container">
          <table className="participants-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>NDIS Number</th>
                <th>Age</th>
                <th>Contact</th>
                <th>Last Assessment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((participant) => (
                <tr key={participant._id}>
                  <td>{participant.fullName}</td>
                  <td>{participant.ndisNumber}</td>
                  <td>{calculateAge(participant.dateOfBirth)}</td>
                  <td>
                    {participant.contactNumber || participant.email ? (
                      <>
                        {participant.contactNumber && (
                          <div>{participant.contactNumber}</div>
                        )}
                        {participant.email && <div>{participant.email}</div>}
                      </>
                    ) : (
                      <span className="no-data">Not provided</span>
                    )}
                  </td>
                  <td>
                    {participant.lastAssessment ? (
                      <>
                        <div>{formatDate(participant.lastAssessment.date)}</div>
                        <div className="assessment-score">
                          Score: {participant.lastAssessment.totalScore}
                        </div>
                      </>
                    ) : (
                      <span className="no-data">No assessments</span>
                    )}
                  </td>
                  <td className="action-buttons">
                    <Link
                      to={`/participants/${participant._id}`}
                      className="view-btn"
                    >
                      View Profile
                    </Link>
                    <Link
                      to={`/assessment/new/${participant._id}`}
                      className="assess-btn"
                    >
                      New Assessment
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {renderPagination()}
      {renderAddParticipantModal()}
    </div>
  );
};

export default Participants;
