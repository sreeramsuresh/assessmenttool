// src/components/ParticipantAssessment.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "../styles/ParticipantAssessment.css";

const API_URL = import.meta.env.VITE_APP_API_URL || "http://localhost:5000";

const ParticipantAssessment = () => {
  const { assignmentId, assessmentId } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [responses, setResponses] = useState({});
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    fetchAssessmentData();
  }, [assessmentId, assignmentId]);

  const fetchAssessmentData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Fetch assessment data
      const assessmentResponse = await axios.get(
        `${API_URL}/api/assessments/${assessmentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Fetch assignment data
      const assignmentResponse = await axios.get(
        `${API_URL}/api/assignments/${assignmentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (assessmentResponse.data.success && assignmentResponse.data.success) {
        const assessmentData = assessmentResponse.data.assessment;
        setAssessment(assessmentData);
        setAssignment(assignmentResponse.data.assignment);

        // Initialize responses if they exist
        if (assessmentData.responses) {
          setResponses(assessmentData.responses);
        } else {
          // Initialize with default values
          const initialResponses = {};
          assessmentData.selectedSections.forEach((sectionIndex) => {
            const section = assessmentData.sections[sectionIndex];
            section.questions.forEach((_, qIndex) => {
              initialResponses[`${sectionIndex}-${qIndex}`] = 3; // Default to Neutral (3)
            });
          });
          setResponses(initialResponses);
        }

        // Initialize comments if they exist
        if (assessmentData.comments) {
          setComments(assessmentData.comments);
        }

        // Calculate initial progress
        if (assessmentData.responses) {
          const totalQuestions = Object.keys(assessmentData.responses).length;
          const answeredQuestions = Object.values(
            assessmentData.responses
          ).filter((value) => value !== null && value !== undefined).length;
          setProgress(
            totalQuestions > 0
              ? Math.round((answeredQuestions / totalQuestions) * 100)
              : 0
          );
        }
      } else {
        setError("Failed to load assessment data.");
      }
    } catch (err) {
      console.error("Error fetching assessment data:", err);
      setError("An error occurred while fetching the assessment data.");
    } finally {
      setLoading(false);
    }
  };

  const handleResponseChange = (sectionIndex, questionIndex, value) => {
    const key = `${sectionIndex}-${questionIndex}`;
    setResponses((prev) => {
      const newResponses = {
        ...prev,
        [key]: value,
      };

      // Calculate new progress
      const totalQuestions = assessment.selectedSections.reduce(
        (total, sectionIndex) =>
          total + assessment.sections[sectionIndex].questions.length,
        0
      );
      const answeredQuestions = Object.values(newResponses).filter(
        (value) => value !== null && value !== undefined
      ).length;
      setProgress(
        totalQuestions > 0
          ? Math.round((answeredQuestions / totalQuestions) * 100)
          : 0
      );

      return newResponses;
    });

    // Auto-save after a change
    saveProgress(
      {
        ...responses,
        [key]: value,
      },
      comments
    );
  };

  const handleCommentChange = (sectionIndex, questionIndex, value) => {
    setComments((prev) => ({
      ...prev,
      [`${sectionIndex}-${questionIndex}`]: value,
    }));
  };

  const saveProgress = async (
    responseData = responses,
    commentData = comments
  ) => {
    try {
      setSaving(true);
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${API_URL}/api/assessments/${assessmentId}/progress`,
        {
          responses: responseData,
          comments: commentData,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        setSaveMessage("Progress saved");
        setTimeout(() => setSaveMessage(""), 3000);
      } else {
        setSaveMessage("Failed to save progress");
      }
    } catch (err) {
      console.error("Error saving progress:", err);
      setSaveMessage("Error saving progress");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndExit = async () => {
    await saveProgress();
    navigate(`/assignments/${assignmentId}`);
  };

  const handleSubmit = async () => {
    // Check if all questions have been answered
    const totalQuestions = assessment.selectedSections.reduce(
      (total, sectionIndex) =>
        total + assessment.sections[sectionIndex].questions.length,
      0
    );
    const answeredQuestions = Object.values(responses).filter(
      (value) => value !== null && value !== undefined
    ).length;

    if (answeredQuestions < totalQuestions) {
      const confirmSubmit = window.confirm(
        `You have only completed ${answeredQuestions} out of ${totalQuestions} questions. Are you sure you want to submit your assessment?`
      );
      if (!confirmSubmit) return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${API_URL}/api/assessments/${assessmentId}/submit`,
        {
          responses,
          comments,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        navigate(`/report/${assessmentId}`);
      } else {
        setError("Failed to submit assessment. Please try again.");
      }
    } catch (err) {
      console.error("Error submitting assessment:", err);
      setError(
        err.response?.data?.message ||
          "An error occurred while submitting the assessment."
      );
    } finally {
      setLoading(false);
    }
  };

  const nextSection = () => {
    if (currentSection < assessment.selectedSections.length - 1) {
      setCurrentSection(currentSection + 1);
      window.scrollTo(0, 0);
    }
    saveProgress();
  };

  const prevSection = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
      window.scrollTo(0, 0);
    }
    saveProgress();
  };

  const renderScale = () => {
    return (
      <div className="scale-legend">
        <div className="scale-item">1 = Strongly Agree (Full Strength)</div>
        <div className="scale-item">2 = Agree</div>
        <div className="scale-item">3 = Neutral</div>
        <div className="scale-item">4 = Disagree</div>
        <div className="scale-item">
          5 = Strongly Disagree (Requires Support)
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="loading">Loading assessment...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!assessment || !assignment) {
    return <div className="not-found">Assessment not found</div>;
  }

  // Get the section index from selectedSections
  const currentSectionIndex = assessment.selectedSections[currentSection];
  const section = assessment.sections[currentSectionIndex];

  return (
    <div className="participant-assessment-container">
      <div className="assessment-header">
        <div className="back-link">
          <Link to={`/assignments/${assignmentId}`}>← Back to Assignment</Link>
        </div>
        <h1>Strengths-Based Needs Assessment</h1>
        <div className="assessment-info">
          <p className="assessment-title">{assignment.title}</p>
          <div className="progress-container">
            <div className="progress-text">Progress: {progress}%</div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {saveMessage && (
        <div className="save-message">
          <span>{saveMessage}</span>
        </div>
      )}

      <div className="assessment-navigation">
        <div className="section-tabs">
          {assessment.selectedSections.map((sectionIndex, index) => (
            <button
              key={index}
              className={`section-tab ${
                currentSection === index ? "active" : ""
              }`}
              onClick={() => {
                saveProgress();
                setCurrentSection(index);
              }}
            >
              {index + 1}. {assessment.sections[sectionIndex].title}
            </button>
          ))}
        </div>
      </div>

      <div className="section-container">
        <h2>
          Section {currentSection + 1}: {section.title}
        </h2>

        {renderScale()}

        <div className="questions-container">
          {section.questions.map((question, qIndex) => (
            <div key={qIndex} className="question-item">
              <div className="question-text">
                <p>
                  {qIndex + 1}. {question}
                </p>
              </div>
              <div className="rating-selector">
                {[1, 2, 3, 4, 5].map((value) => (
                  <div key={value} className="rating-option">
                    <input
                      type="radio"
                      id={`q-${currentSectionIndex}-${qIndex}-${value}`}
                      name={`question-${currentSectionIndex}-${qIndex}`}
                      value={value}
                      checked={
                        responses[`${currentSectionIndex}-${qIndex}`] === value
                      }
                      onChange={() =>
                        handleResponseChange(currentSectionIndex, qIndex, value)
                      }
                    />
                    <label
                      htmlFor={`q-${currentSectionIndex}-${qIndex}-${value}`}
                    >
                      {value}
                    </label>
                  </div>
                ))}
              </div>
              <div className="comment-section">
                <label>Additional notes/observations:</label>
                <textarea
                  value={comments[`${currentSectionIndex}-${qIndex}`] || ""}
                  onChange={(e) =>
                    handleCommentChange(
                      currentSectionIndex,
                      qIndex,
                      e.target.value
                    )
                  }
                  placeholder="Enter additional observations or notes here..."
                  onBlur={() => saveProgress()}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="navigation-buttons">
        {currentSection > 0 && (
          <button className="prev-button" onClick={prevSection}>
            Previous
          </button>
        )}

        {currentSection < assessment.selectedSections.length - 1 ? (
          <button className="next-button" onClick={nextSection}>
            Next
          </button>
        ) : (
          <button className="submit-button" onClick={handleSubmit}>
            Submit Assessment
          </button>
        )}

        <button className="save-exit-button" onClick={handleSaveAndExit}>
          Save & Exit
        </button>
      </div>
    </div>
  );
};

export default ParticipantAssessment;
