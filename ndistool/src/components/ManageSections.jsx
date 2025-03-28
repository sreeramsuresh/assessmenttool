// src/components/ManageSections.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../styles/ManageSections.css";

const API_URL = import.meta.env.VITE_APP_API_URL || "http://localhost:5000";

const ManageSections = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    question: "",
  });
  const [newSection, setNewSection] = useState({
    title: "",
    questions: [""],
  });
  const [showAddSection, setShowAddSection] = useState(false);

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const response = await axios.get(
        `${API_URL}/api/assessments/standard-sections`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setSections(response.data.sections);
      } else {
        setError("Failed to load sections. Please try again.");
      }
    } catch (err) {
      console.error("Error fetching sections:", err);
      setError("An error occurred while fetching the sections.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSection = (sectionId) => {
    const section = sections.find((s) => s._id === sectionId);
    if (section) {
      setEditForm({
        title: section.title,
        question: "",
      });
      setEditingSectionId(sectionId);
      setEditingQuestionId(null);
    }
  };

  const handleEditQuestion = (sectionId, questionId, questionText) => {
    setEditForm({
      title: "",
      question: questionText,
    });
    setEditingSectionId(sectionId);
    setEditingQuestionId(questionId);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddQuestionToNewSection = () => {
    setNewSection((prev) => ({
      ...prev,
      questions: [...prev.questions, ""],
    }));
  };

  const handleRemoveQuestionFromNewSection = (index) => {
    setNewSection((prev) => {
      const questions = [...prev.questions];
      questions.splice(index, 1);
      return { ...prev, questions };
    });
  };

  const handleNewSectionChange = (e) => {
    const { name, value } = e.target;
    setNewSection((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNewQuestionChange = (index, value) => {
    setNewSection((prev) => {
      const questions = [...prev.questions];
      questions[index] = value;
      return { ...prev, questions };
    });
  };

  const handleSaveSection = async () => {
    if (!editForm.title.trim()) {
      setError("Section title is required");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${API_URL}/api/assessments/sections/${editingSectionId}`,
        { title: editForm.title },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        // Update section in state
        setSections((prev) =>
          prev.map((section) =>
            section._id === editingSectionId
              ? { ...section, title: editForm.title }
              : section
          )
        );
        setSuccess("Section updated successfully");
        setEditingSectionId(null);
        setEditForm({ title: "", question: "" });
      } else {
        setError("Failed to update section");
      }
    } catch (err) {
      console.error("Error updating section:", err);
      setError("An error occurred while updating the section");
    }
  };

  const handleSaveQuestion = async () => {
    if (!editForm.question.trim()) {
      setError("Question text is required");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${API_URL}/api/assessments/sections/${editingSectionId}/questions/${editingQuestionId}`,
        { text: editForm.question },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        // Update question in state
        setSections((prev) =>
          prev.map((section) => {
            if (section._id !== editingSectionId) return section;
            return {
              ...section,
              questions: section.questions.map((q, i) =>
                i === parseInt(editingQuestionId) ? editForm.question : q
              ),
            };
          })
        );
        setSuccess("Question updated successfully");
        setEditingSectionId(null);
        setEditingQuestionId(null);
        setEditForm({ title: "", question: "" });
      } else {
        setError("Failed to update question");
      }
    } catch (err) {
      console.error("Error updating question:", err);
      setError("An error occurred while updating the question");
    }
  };

  const handleAddQuestion = async (sectionId) => {
    if (!editForm.question.trim()) {
      setError("Question text is required");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/api/assessments/sections/${sectionId}/questions`,
        { text: editForm.question },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        // Add question to state
        setSections((prev) =>
          prev.map((section) => {
            if (section._id !== sectionId) return section;
            return {
              ...section,
              questions: [...section.questions, editForm.question],
            };
          })
        );
        setSuccess("Question added successfully");
        setEditForm({ title: "", question: "" });
      } else {
        setError("Failed to add question");
      }
    } catch (err) {
      console.error("Error adding question:", err);
      setError("An error occurred while adding the question");
    }
  };

  const handleAddSection = async () => {
    if (!newSection.title.trim()) {
      setError("Section title is required");
      return;
    }

    if (newSection.questions.some((q) => !q.trim())) {
      setError("All questions must have text");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/api/assessments/sections`,
        newSection,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        // Add new section to state
        setSections((prev) => [...prev, response.data.section]);
        setSuccess("Section added successfully");
        setNewSection({ title: "", questions: [""] });
        setShowAddSection(false);
      } else {
        setError("Failed to add section");
      }
    } catch (err) {
      console.error("Error adding section:", err);
      setError("An error occurred while adding the section");
    }
  };

  const handleDeleteQuestion = async (sectionId, questionIndex) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this question? This action cannot be undone."
    );

    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("token");
      const response = await axios.delete(
        `${API_URL}/api/assessments/sections/${sectionId}/questions/${questionIndex}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        // Remove question from state
        setSections((prev) =>
          prev.map((section) => {
            if (section._id !== sectionId) return section;
            return {
              ...section,
              questions: section.questions.filter(
                (_, i) => i !== questionIndex
              ),
            };
          })
        );
        setSuccess("Question deleted successfully");
      } else {
        setError("Failed to delete question");
      }
    } catch (err) {
      console.error("Error deleting question:", err);
      setError("An error occurred while deleting the question");
    }
  };

  const handleDeleteSection = async (sectionId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this section and all its questions? This action cannot be undone."
    );

    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("token");
      const response = await axios.delete(
        `${API_URL}/api/assessments/sections/${sectionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        // Remove section from state
        setSections((prev) =>
          prev.filter((section) => section._id !== sectionId)
        );
        setSuccess("Section deleted successfully");
      } else {
        setError("Failed to delete section");
      }
    } catch (err) {
      console.error("Error deleting section:", err);
      setError("An error occurred while deleting the section");
    }
  };

  if (loading) {
    return <div className="loading">Loading sections...</div>;
  }

  return (
    <div className="manage-sections-container">
      <div className="page-header">
        <div className="back-link">
          <Link to="/admin">← Back to Admin Dashboard</Link>
        </div>
        <h1>Manage Assessment Sections</h1>
        <button
          className="add-section-btn"
          onClick={() => setShowAddSection(!showAddSection)}
        >
          {showAddSection ? "Cancel" : "Add New Section"}
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button
            className="close-btn"
            onClick={() => setError("")}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
          <button
            className="close-btn"
            onClick={() => setSuccess("")}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
      )}

      {showAddSection && (
        <div className="section-form-card">
          <h2>Add New Section</h2>
          <div className="form-group">
            <label htmlFor="title">Section Title*</label>
            <input
              type="text"
              id="title"
              name="title"
              value={newSection.title}
              onChange={handleNewSectionChange}
              placeholder="Enter section title"
              required
            />
          </div>

          <h3>Questions</h3>
          {newSection.questions.map((question, index) => (
            <div key={index} className="question-input-group">
              <div className="form-group">
                <label htmlFor={`question-${index}`}>
                  Question {index + 1}*
                </label>
                <div className="question-input-row">
                  <input
                    type="text"
                    id={`question-${index}`}
                    value={question}
                    onChange={(e) =>
                      handleNewQuestionChange(index, e.target.value)
                    }
                    placeholder="Enter question text"
                    required
                  />
                  <button
                    type="button"
                    className="remove-question-btn"
                    onClick={() => handleRemoveQuestionFromNewSection(index)}
                    disabled={newSection.questions.length === 1}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            className="add-question-btn"
            onClick={handleAddQuestionToNewSection}
          >
            + Add Question
          </button>

          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => {
                setShowAddSection(false);
                setNewSection({ title: "", questions: [""] });
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="submit-btn"
              onClick={handleAddSection}
            >
              Add Section
            </button>
          </div>
        </div>
      )}

      <div className="sections-list">
        {sections.map((section, sectionIndex) => (
          <div key={section._id || sectionIndex} className="section-card">
            <div className="section-header">
              {editingSectionId === section._id ? (
                <div className="section-edit-form">
                  <input
                    type="text"
                    name="title"
                    value={editForm.title}
                    onChange={handleFormChange}
                    placeholder="Section title"
                  />
                  <div className="edit-actions">
                    <button
                      className="cancel-btn"
                      onClick={() => setEditingSectionId(null)}
                    >
                      Cancel
                    </button>
                    <button className="save-btn" onClick={handleSaveSection}>
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="section-title-row">
                  <h2 className="section-title">
                    {sectionIndex + 1}. {section.title}
                  </h2>
                  <div className="section-actions">
                    <button
                      className="edit-btn"
                      onClick={() => handleEditSection(section._id)}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteSection(section._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="questions-list">
              {section.questions.map((question, questionIndex) => (
                <div key={questionIndex} className="question-item">
                  {editingSectionId === section._id &&
                  editingQuestionId === questionIndex ? (
                    <div className="question-edit-form">
                      <textarea
                        name="question"
                        value={editForm.question}
                        onChange={handleFormChange}
                        placeholder="Question text"
                        rows="3"
                      ></textarea>
                      <div className="edit-actions">
                        <button
                          className="cancel-btn"
                          onClick={() => {
                            setEditingSectionId(null);
                            setEditingQuestionId(null);
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          className="save-btn"
                          onClick={handleSaveQuestion}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="question-row">
                      <p className="question-text">
                        {questionIndex + 1}. {question}
                      </p>
                      <div className="question-actions">
                        <button
                          className="edit-btn"
                          onClick={() =>
                            handleEditQuestion(
                              section._id,
                              questionIndex,
                              question
                            )
                          }
                        >
                          Edit
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() =>
                            handleDeleteQuestion(section._id, questionIndex)
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="add-question-section">
              <h3>Add New Question</h3>
              <div className="add-question-form">
                <textarea
                  placeholder="Enter new question text"
                  rows="3"
                  value={
                    editingSectionId === section._id &&
                    editingQuestionId === null
                      ? editForm.question
                      : ""
                  }
                  onChange={(e) =>
                    setEditForm({ ...editForm, question: e.target.value })
                  }
                ></textarea>
                <button
                  className="add-btn"
                  onClick={() => handleAddQuestion(section._id)}
                >
                  Add Question
                </button>
              </div>
            </div>
          </div>
        ))}

        {sections.length === 0 && (
          <div className="empty-state">
            <p>No assessment sections have been created yet.</p>
            <button
              className="add-section-btn"
              onClick={() => setShowAddSection(true)}
            >
              Create First Section
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageSections;
