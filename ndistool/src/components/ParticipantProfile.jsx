// src/components/ParticipantProfile.jsx
import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/ParticipantProfile.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const ParticipantProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [participant, setParticipant] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({
    fullName: "",
    ndisNumber: "",
    dateOfBirth: "",
    contactNumber: "",
    email: "",
    address: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchParticipantData();
  }, [id]);

  const fetchParticipantData = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      // Fetch participant details
      const participantResponse = await axios.get(
        `${API_URL}/api/participants/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (participantResponse.data.success) {
        setParticipant(participantResponse.data.participant);
        setEditData({
          fullName: participantResponse.data.participant.fullName,
          ndisNumber: participantResponse.data.participant.ndisNumber,
          dateOfBirth:
            participantResponse.data.participant.dateOfBirth.split("T")[0], // Format for input
          contactNumber:
            participantResponse.data.participant.contactNumber || "",
          email: participantResponse.data.participant.email || "",
          address: participantResponse.data.participant.address || "",
        });

        // Fetch participant's assessments
        const assessmentsResponse = await axios.get(
          `${API_URL}/api/assessments/participant/${participantResponse.data.participant.ndisNumber}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (assessmentsResponse.data.success) {
          setAssessments(assessmentsResponse.data.assessments);
        }
      } else {
        setError("Failed to load participant details.");
      }
    } catch (err) {
      console.error("Error fetching participant data:", err);
      setError("An error occurred while fetching participant data.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditParticipant = async (e) => {
    e.preventDefault();

    // Basic validation
    const errors = {};
    if (!editData.fullName.trim()) errors.fullName = "Name is required";
    if (!editData.ndisNumber.trim())
      errors.ndisNumber = "NDIS number is required";
    if (!editData.dateOfBirth) errors.dateOfBirth = "Date of birth is required";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await axios.put(
        `${API_URL}/api/participants/${id}`,
        editData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        // Close modal and refresh data
        setShowEditModal(false);
        fetchParticipantData();
      } else {
        setError(response.data.message || "Failed to update participant");
      }
    } catch (err) {
      console.error("Error updating participant:", err);
      setError("An error occurred while updating the participant.");
    }
  };

  const handleDeleteParticipant = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.delete(`${API_URL}/api/participants/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        // Redirect to participants list
        navigate("/participants");
      } else {
        setError(response.data.message || "Failed to delete participant");
        setShowDeleteConfirm(false);
      }
    } catch (err) {
      console.error("Error deleting participant:", err);
      setError("An error occurred while deleting the participant.");
      setShowDeleteConfirm(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({
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

  const renderEditModal = () => {
    if (!showEditModal) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Edit Participant</h2>
            <button
              className="close-btn"
              onClick={() => setShowEditModal(false)}
            >
              &times;
            </button>
          </div>

          <form onSubmit={handleEditParticipant} className="participant-form">
            <div className="form-group">
              <label htmlFor="fullName">Full Name*</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={editData.fullName}
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
                value={editData.ndisNumber}
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
                value={editData.dateOfBirth}
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
                value={editData.contactNumber}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={editData.email}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="address">Address</label>
              <textarea
                id="address"
                name="address"
                value={editData.address}
                onChange={handleInputChange}
                rows="3"
              />
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="submit-btn">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderDeleteConfirmation = () => {
    if (!showDeleteConfirm) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content confirm-dialog">
          <div className="modal-header">
            <h2>Confirm Deletion</h2>
            <button
              className="close-btn"
              onClick={() => setShowDeleteConfirm(false)}
            >
              &times;
            </button>
          </div>

          <div className="confirm-content">
            <p>Are you sure you want to delete {participant.fullName}?</p>
            <p className="warning-text">
              This action cannot be undone. All associated assessment data will
              be preserved.
            </p>
          </div>

          <div className="modal-footer">
            <button
              className="cancel-btn"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </button>
            <button className="delete-btn" onClick={handleDeleteParticipant}>
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="loading">Loading participant data...</div>;
  }

  if (error) {
    return <div className="error-container">{error}</div>;
  }

  if (!participant) {
    return <div className="not-found">Participant not found</div>;
  }

  return (
    <div className="participant-profile">
      <div className="profile-header">
        <div className="back-link">
          <Link to="/participants">← Back to Participants</Link>
        </div>
        <h1>{participant.fullName}</h1>
        <div className="profile-actions">
          <button className="edit-btn" onClick={() => setShowEditModal(true)}>
            Edit Profile
          </button>
          <button
            className="delete-btn"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete Participant
          </button>
        </div>
      </div>

      <div className="profile-content">
        <div className="participant-card">
          <div className="participant-info">
            <div className="info-section">
              <h2>Personal Information</h2>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">NDIS Number:</span>
                  <span className="info-value">{participant.ndisNumber}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Date of Birth:</span>
                  <span className="info-value">
                    {formatDate(participant.dateOfBirth)}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Age:</span>
                  <span className="info-value">
                    {calculateAge(participant.dateOfBirth)} years
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Contact Number:</span>
                  <span className="info-value">
                    {participant.contactNumber || (
                      <span className="no-data">Not provided</span>
                    )}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Email:</span>
                  <span className="info-value">
                    {participant.email || (
                      <span className="no-data">Not provided</span>
                    )}
                  </span>
                </div>
                <div className="info-item full-width">
                  <span className="info-label">Address:</span>
                  <span className="info-value">
                    {participant.address || (
                      <span className="no-data">Not provided</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="info-section">
              <h2>Assessment Summary</h2>
              <div className="summary-stats">
                <div className="stat-item">
                  <span className="stat-value">{assessments.length}</span>
                  <span className="stat-label">Total Assessments</span>
                </div>
                {assessments.length > 0 && (
                  <>
                    <div className="stat-item">
                      <span className="stat-value">
                        {formatDate(assessments[0].date)}
                      </span>
                      <span className="stat-label">Latest Assessment</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-value">
                        {assessments[0].totalScore}
                      </span>
                      <span className="stat-label">Latest Score</span>
                    </div>
                  </>
                )}
              </div>

              <div className="assessment-actions">
                <Link
                  to={`/assessment/new/${participant._id}`}
                  className="new-assessment-btn"
                >
                  Conduct New Assessment
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="assessment-history">
          <div className="section-header">
            <h2>Assessment History</h2>
            {assessments.length > 0 && (
              <Link
                to={`/participants/${participant._id}/assessments`}
                className="view-all-link"
              >
                View All Details
              </Link>
            )}
          </div>

          {assessments.length === 0 ? (
            <div className="no-assessments">
              <p>
                No assessments have been conducted for this participant yet.
              </p>
            </div>
          ) : (
            <div className="assessments-table-container">
              <table className="assessments-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Score</th>
                    <th>Interpretation</th>
                    <th>Assessor</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assessments.map((assessment) => (
                    <tr key={assessment._id}>
                      <td>{formatDate(assessment.date)}</td>
                      <td>{assessment.totalScore}</td>
                      <td>{assessment.interpretation}</td>
                      <td>
                        {assessment.assessor ? (
                          assessment.assessor.name
                        ) : (
                          <span className="no-data">Unknown</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`status-badge status-${assessment.status
                            .toLowerCase()
                            .replace(" ", "-")}`}
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
          )}
        </div>
      </div>

      {renderEditModal()}
      {renderDeleteConfirmation()}
    </div>
  );
};

export default ParticipantProfile;
