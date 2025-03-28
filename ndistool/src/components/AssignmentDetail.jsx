// src/components/AssignmentDetail.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/AssignmentDetail.css";

const API_URL = import.meta.env.VITE_APP_API_URL || "http://localhost:5000";

const AssignmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");
  const [note, setNote] = useState("");
  const [showAddNote, setShowAddNote] = useState(false);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");

  useEffect(() => {
    const userInfo = localStorage.getItem("user");
    if (userInfo) {
      const user = JSON.parse(userInfo);
      setUserRole(user.role);
    }

    fetchAssignmentDetails();
  }, [id]);

  const fetchAssignmentDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const response = await axios.get(`${API_URL}/api/assignments/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setAssignment(response.data.assignment);
      } else {
        setError("Failed to load assignment details.");
      }
    } catch (err) {
      console.error("Error fetching assignment details:", err);
      setError("An error occurred while fetching the assignment details.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedStatus) return;

    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${API_URL}/api/assignments/${id}/status`,
        { status: selectedStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        setAssignment({ ...assignment, status: selectedStatus });
        setShowStatusUpdate(false);
      } else {
        setError("Failed to update assignment status.");
      }
    } catch (err) {
      console.error("Error updating assignment status:", err);
      setError("An error occurred while updating the assignment status.");
    }
  };

  const handleAddNote = async () => {
    if (!note.trim()) return;

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/api/assignments/${id}/notes`,
        { note },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        setAssignment({
          ...assignment,
          notes: [...assignment.notes, response.data.note],
        });
        setNote("");
        setShowAddNote(false);
      } else {
        setError("Failed to add note.");
      }
    } catch (err) {
      console.error("Error adding note:", err);
      setError("An error occurred while adding the note.");
    }
  };

  const handleDelete = async () => {
    const confirm = window.confirm(
      "Are you sure you want to delete this assignment? This action cannot be undone."
    );

    if (!confirm) return;

    try {
      const token = localStorage.getItem("token");
      const response = await axios.delete(`${API_URL}/api/assignments/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        navigate("/assignments");
      } else {
        setError("Failed to delete assignment.");
      }
    } catch (err) {
      console.error("Error deleting assignment:", err);
      setError("An error occurred while deleting the assignment.");
    }
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

  if (loading) {
    return <div className="loading">Loading assignment details...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!assignment) {
    return <div className="not-found">Assignment not found</div>;
  }

  return (
    <div className="assignment-detail-container">
      <div className="assignment-header">
        <div className="back-link">
          <Link to="/assignments">← Back to Assignments</Link>
        </div>
        <div className="assignment-title">
          <h1>{assignment.title}</h1>
          <span
            className={`status-badge ${getStatusBadgeClass(assignment.status)}`}
          >
            {getStatusLabel(assignment.status)}
          </span>
        </div>
        {(userRole === "supervisor" || userRole === "admin") && (
          <div className="assignment-actions">
            <button
              className="status-btn"
              onClick={() => setShowStatusUpdate(!showStatusUpdate)}
            >
              Update Status
            </button>
            <button className="delete-btn" onClick={handleDelete}>
              Delete Assignment
            </button>
          </div>
        )}
      </div>

      {showStatusUpdate && (
        <div className="status-update-form">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="status-select"
          >
            <option value="">Select Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button className="update-status-btn" onClick={handleStatusUpdate}>
            Update
          </button>
          <button
            className="cancel-btn"
            onClick={() => setShowStatusUpdate(false)}
          >
            Cancel
          </button>
        </div>
      )}

      <div className="assignment-content">
        <div className="assignment-card">
          <div className="card-header">
            <h2>Assignment Details</h2>
          </div>
          <div className="assignment-info">
            <div className="info-row">
              <div className="info-label">Participant:</div>
              <div className="info-value">
                {assignment.participant ? (
                  <Link to={`/participants/${assignment.participant._id}`}>
                    {assignment.participant.fullName}
                  </Link>
                ) : (
                  "Not assigned"
                )}
              </div>
            </div>
            <div className="info-row">
              <div className="info-label">Assessor:</div>
              <div className="info-value">
                {assignment.assessor
                  ? assignment.assessor.name
                  : "Not assigned"}
              </div>
            </div>
            <div className="info-row">
              <div className="info-label">Supervisor:</div>
              <div className="info-value">
                {assignment.supervisor
                  ? assignment.supervisor.name
                  : "Not assigned"}
              </div>
            </div>
            <div className="info-row">
              <div className="info-label">Due Date:</div>
              <div className="info-value">{formatDate(assignment.dueDate)}</div>
            </div>
            <div className="info-row">
              <div className="info-label">Start Date:</div>
              <div className="info-value">
                {formatDate(assignment.startDate)}
              </div>
            </div>
            <div className="info-row">
              <div className="info-label">Completion Date:</div>
              <div className="info-value">
                {assignment.completionDate
                  ? formatDate(assignment.completionDate)
                  : "Not completed"}
              </div>
            </div>
            <div className="info-row full-width">
              <div className="info-label">Description:</div>
              <div className="info-value description">
                {assignment.description || "No description provided"}
              </div>
            </div>
          </div>
        </div>

        <div className="assessments-card">
          <div className="card-header">
            <h2>Assessments</h2>
            {(userRole === "supervisor" || userRole === "assessor") && (
              <button className="add-assessment-btn">Add Assessment</button>
            )}
          </div>
          {assignment.assessments && assignment.assessments.length > 0 ? (
            <div className="assessments-list">
              {assignment.assessments.map((assessment) => (
                <div key={assessment._id} className="assessment-item">
                  <div className="assessment-info">
                    <div className="assessment-name">
                      Assessment #{assessment._id.substring(0, 8)}
                    </div>
                    <div className="assessment-status">
                      <span
                        className={`status-badge ${getStatusBadgeClass(
                          assessment.status
                        )}`}
                      >
                        {assessment.status}
                      </span>
                    </div>
                  </div>
                  <div className="assessment-actions">
                    <Link
                      to={`/report/${assessment._id}`}
                      className="view-assessment-btn"
                    >
                      View Assessment
                    </Link>
                    {userRole === "participant" &&
                      (assessment.status === "Assigned" ||
                        assessment.status === "In Progress") && (
                        <Link
                          to={`/take-assessment/${assignment._id}/${assessment._id}`}
                          className="take-assessment-btn"
                        >
                          Take Assessment
                        </Link>
                      )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-assessments">
              <p>No assessments have been created for this assignment yet.</p>
            </div>
          )}
        </div>

        <div className="notes-card">
          <div className="card-header">
            <h2>Notes & Activity</h2>
            <button
              className="add-note-btn"
              onClick={() => setShowAddNote(!showAddNote)}
            >
              Add Note
            </button>
          </div>

          {showAddNote && (
            <div className="add-note-form">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Enter your note here..."
                rows="3"
                className="note-textarea"
              ></textarea>
              <div className="note-actions">
                <button className="save-note-btn" onClick={handleAddNote}>
                  Save Note
                </button>
                <button
                  className="cancel-btn"
                  onClick={() => setShowAddNote(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="notes-list">
            {assignment.notes && assignment.notes.length > 0 ? (
              assignment.notes.map((note, index) => (
                <div key={index} className="note-item">
                  <div className="note-header">
                    <div className="note-author">
                      {note.author ? note.author.name : "System"}
                    </div>
                    <div className="note-date">
                      {new Date(note.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="note-content">{note.text}</div>
                </div>
              ))
            ) : (
              <div className="no-notes">No notes have been added yet.</div>
            )}
          </div>
        </div>

        <div className="history-card">
          <div className="card-header">
            <h2>Assignment History</h2>
          </div>
          <div className="history-list">
            {assignment.history && assignment.history.length > 0 ? (
              assignment.history.map((entry, index) => (
                <div key={index} className="history-item">
                  <div className="history-date">
                    {new Date(entry.date).toLocaleString()}
                  </div>
                  <div className="history-details">
                    <span className="history-action">{entry.action}</span>
                    {entry.user && (
                      <span className="history-user">by {entry.user.name}</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-history">
                No history records are available for this assignment.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentDetail;
