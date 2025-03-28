// src/components/CreateAssignment.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "../styles/CreateAssignment.css";

const API_URL = import.meta.env.VITE_APP_API_URL || "http://localhost:5000";

const CreateAssignment = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    participant: "",
    assessor: "",
    dueDate: "",
    requiredSections: [],
  });
  const [participants, setParticipants] = useState([]);
  const [assessors, setAssessors] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    const userInfo = localStorage.getItem("user");
    if (userInfo) {
      const user = JSON.parse(userInfo);
      setUserRole(user.role);

      // Redirect if user is not a supervisor or admin
      if (user.role !== "supervisor" && user.role !== "admin") {
        navigate("/assignments");
      }
    }

    fetchFormData();
  }, [navigate]);

  const fetchFormData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Fetch participants
      const participantsResponse = await axios.get(
        `${API_URL}/api/participants`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Fetch assessors
      const assessorsResponse = await axios.get(
        `${API_URL}/api/users?role=assessor`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Fetch standard sections
      const sectionsResponse = await axios.get(
        `${API_URL}/api/assessments/standard-sections`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (
        participantsResponse.data.success &&
        assessorsResponse.data.success &&
        sectionsResponse.data.success
      ) {
        setParticipants(participantsResponse.data.participants);
        setAssessors(assessorsResponse.data.users);
        setSections(sectionsResponse.data.sections);
      } else {
        setError("Failed to load form data. Please try again.");
      }
    } catch (err) {
      console.error("Error fetching form data:", err);
      setError("An error occurred while fetching the form data.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSectionToggle = (sectionIndex) => {
    setFormData((prev) => {
      const sectionExists = prev.requiredSections.includes(sectionIndex);
      let updatedSections;

      if (sectionExists) {
        updatedSections = prev.requiredSections.filter(
          (index) => index !== sectionIndex
        );
      } else {
        updatedSections = [...prev.requiredSections, sectionIndex];
      }

      return {
        ...prev,
        requiredSections: updatedSections,
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!formData.title.trim()) {
      setError("Assignment title is required");
      return;
    }

    if (!formData.participant) {
      setError("Participant selection is required");
      return;
    }

    if (!formData.assessor) {
      setError("Assessor selection is required");
      return;
    }

    if (formData.requiredSections.length === 0) {
      setError("At least one section must be selected");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/api/assignments`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        navigate(`/assignments/${response.data.assignment._id}`);
      } else {
        setError("Failed to create assignment. Please try again.");
      }
    } catch (err) {
      console.error("Error creating assignment:", err);
      setError(
        err.response?.data?.message ||
          "An error occurred while creating the assignment."
      );
    }
  };

  if (loading) {
    return <div className="loading">Loading form data...</div>;
  }

  return (
    <div className="create-assignment-container">
      <div className="page-header">
        <div className="back-link">
          <Link to="/assignments">← Back to Assignments</Link>
        </div>
        <h1>Create New Assignment</h1>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="assignment-form">
        <div className="form-section">
          <h2>Basic Information</h2>
          <div className="form-group">
            <label htmlFor="title">Assignment Title*</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Enter a descriptive title for this assignment"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              placeholder="Provide details about this assignment"
            ></textarea>
          </div>
        </div>

        <div className="form-section">
          <h2>Assignment Details</h2>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="participant">Participant*</label>
              <select
                id="participant"
                name="participant"
                value={formData.participant}
                onChange={handleChange}
                required
              >
                <option value="">Select a Participant</option>
                {participants.map((participant) => (
                  <option key={participant._id} value={participant._id}>
                    {participant.fullName} - {participant.ndisNumber}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="assessor">Assessor*</label>
              <select
                id="assessor"
                name="assessor"
                value={formData.assessor}
                onChange={handleChange}
                required
              >
                <option value="">Select an Assessor</option>
                {assessors.map((assessor) => (
                  <option key={assessor._id} value={assessor._id}>
                    {assessor.name} - {assessor.organization}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dueDate">Due Date</label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Assessment Sections</h2>
          <p className="section-help-text">
            Select the sections to include in the participant's assessment:
          </p>
          <div className="sections-container">
            {sections.map((section, index) => (
              <div key={index} className="section-item">
                <label className="section-label">
                  <input
                    type="checkbox"
                    checked={formData.requiredSections.includes(index)}
                    onChange={() => handleSectionToggle(index)}
                  />
                  <span className="section-title">{section.title}</span>
                </label>
              </div>
            ))}
          </div>
          {formData.requiredSections.length === 0 && (
            <p className="section-warning">
              At least one section must be selected
            </p>
          )}
        </div>

        <div className="form-actions">
          <Link to="/assignments" className="cancel-btn">
            Cancel
          </Link>
          <button type="submit" className="submit-btn">
            Create Assignment
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateAssignment;
