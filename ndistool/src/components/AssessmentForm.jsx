// src/components/AssessmentForm.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/AssessmentForm.css";

const API_URL = import.meta.env.VITE_APP_API_URL || "http://localhost:5000";

const sections = [
  {
    title: "Personal Care & Daily Living Strengths",
    questions: [
      "I am confident in managing my personal hygiene and grooming independently.",
      "I am able to prepare and eat meals that meet my nutritional needs.",
      "I can effectively manage my medications and medical treatments.",
      "I maintain independence in toileting and continence management.",
      "I can manage household cleaning and maintenance on my own.",
    ],
  },
  {
    title: "Mobility & Accessibility Strengths",
    questions: [
      "I am able to move around my home and community independently.",
      "I have access to and effectively use assistive mobility devices if needed.",
      "I can access and use transportation without assistance.",
      "I navigate indoor and outdoor environments with ease.",
      "I am confident in transferring between different locations without support.",
    ],
  },
  {
    title: "Communication & Social Strengths",
    questions: [
      "I can effectively communicate my thoughts, needs, and preferences.",
      "I have access to and use assistive communication tools when necessary.",
      "I actively engage with family, friends, and my community.",
      "I understand and process conversations effectively.",
      "I confidently participate in social and recreational activities.",
    ],
  },
  {
    title: "Learning, Employment & Education Strengths",
    questions: [
      "I feel confident in accessing education or vocational training opportunities.",
      "I can perform work-related tasks and manage workplace requirements.",
      "I enjoy learning new skills and expanding my knowledge.",
      "I can focus, retain information, and apply learning in daily activities.",
      "I can effectively manage responsibilities in an educational or work setting.",
    ],
  },
  {
    title: "Health & Well-being Strengths",
    questions: [
      "I manage my mental health and emotional well-being effectively.",
      "I can attend and participate in necessary medical appointments.",
      "I manage any pain or discomfort that affects my daily life.",
      "I handle stress, anxiety, and emotional challenges with confidence.",
      "I follow a healthy diet and maintain good nutrition.",
    ],
  },
  {
    title: "Safety & Independence Strengths",
    questions: [
      "I feel safe and secure in my home and community.",
      "I can respond to emergencies and use alert systems if needed.",
      "I manage my personal finances and budgeting independently.",
      "I make informed decisions regarding my health, safety, and well-being.",
      "I have control over my living environment and personal security.",
    ],
  },
];

const AssessmentForm = () => {
  const [currentSection, setCurrentSection] = useState(0);
  const [responses, setResponses] = useState({});
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [participantDetails, setParticipantDetails] = useState({
    fullName: "",
    ndisNumber: "",
    dateOfBirth: "",
    contactNumber: "",
    email: "",
    address: "",
  });

  const navigate = useNavigate();

  useEffect(() => {
    // Initialize responses for all questions
    const initialResponses = {};
    sections.forEach((section, sIndex) => {
      section.questions.forEach((_, qIndex) => {
        initialResponses[`${sIndex}-${qIndex}`] = 3; // Default to Neutral (3)
      });
    });
    setResponses(initialResponses);
  }, []);

  const handleParticipantChange = (e) => {
    const { name, value } = e.target;
    setParticipantDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleResponseChange = (sectionIndex, questionIndex, value) => {
    setResponses((prev) => ({
      ...prev,
      [`${sectionIndex}-${questionIndex}`]: value,
    }));
  };

  const handleCommentChange = (sectionIndex, questionIndex, value) => {
    setComments((prev) => ({
      ...prev,
      [`${sectionIndex}-${questionIndex}`]: value,
    }));
  };

  const calculateTotalScore = () => {
    return Object.values(responses).reduce((total, val) => total + val, 0);
  };

  const nextSection = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevSection = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const totalScore = calculateTotalScore();
    let interpretationText = "";

    if (totalScore >= 30 && totalScore <= 60) {
      interpretationText = "Strong independence, minimal support needed.";
    } else if (totalScore >= 61 && totalScore <= 90) {
      interpretationText = "Moderate independence, some areas for growth.";
    } else {
      interpretationText = "Areas requiring targeted support and development.";
    }

    // Prepare data for submission
    const assessmentData = {
      participantDetails,
      responses,
      comments,
      totalScore,
      interpretation: interpretationText,
      date: new Date().toISOString(),
      sectionTitles: sections.map((section) => section.title),
      questions: sections.flatMap((section, sIndex) =>
        section.questions.map((question, qIndex) => ({
          sectionIndex: sIndex,
          questionIndex: qIndex,
          text: question,
        }))
      ),
    };

    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${API_URL}/api/assessments`,
        assessmentData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setLoading(false);

      if (response.data.success) {
        navigate(`/report/${response.data.assessmentId}`);
      } else {
        setError("Failed to submit assessment. Please try again.");
      }
    } catch (err) {
      setLoading(false);
      setError(
        "An error occurred. Please check your connection and try again."
      );
    }
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

  return (
    <div className="assessment-container">
      <h1>Strengths-Based Needs Assessment</h1>

      {currentSection === 0 && (
        <div className="participant-info">
          <h2>Participant Information</h2>
          <div className="form-group">
            <label>Full Name:</label>
            <input
              type="text"
              name="fullName"
              value={participantDetails.fullName}
              onChange={handleParticipantChange}
              required
            />
          </div>
          <div className="form-group">
            <label>NDIS Number:</label>
            <input
              type="text"
              name="ndisNumber"
              value={participantDetails.ndisNumber}
              onChange={handleParticipantChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Date of Birth:</label>
            <input
              type="date"
              name="dateOfBirth"
              value={participantDetails.dateOfBirth}
              onChange={handleParticipantChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Contact Number:</label>
            <input
              type="tel"
              name="contactNumber"
              value={participantDetails.contactNumber}
              onChange={handleParticipantChange}
            />
          </div>
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              name="email"
              value={participantDetails.email}
              onChange={handleParticipantChange}
            />
          </div>
          <div className="form-group">
            <label>Address:</label>
            <textarea
              name="address"
              value={participantDetails.address}
              onChange={handleParticipantChange}
            />
          </div>
        </div>
      )}

      {currentSection > 0 && (
        <>
          <div className="section-container">
            <h2>
              Section {currentSection}: {sections[currentSection - 1].title}
            </h2>

            {renderScale()}

            <div className="questions-container">
              {sections[currentSection - 1].questions.map(
                (question, qIndex) => (
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
                            id={`q-${currentSection - 1}-${qIndex}-${value}`}
                            name={`question-${currentSection - 1}-${qIndex}`}
                            value={value}
                            checked={
                              responses[`${currentSection - 1}-${qIndex}`] ===
                              value
                            }
                            onChange={() =>
                              handleResponseChange(
                                currentSection - 1,
                                qIndex,
                                value
                              )
                            }
                          />
                          <label
                            htmlFor={`q-${
                              currentSection - 1
                            }-${qIndex}-${value}`}
                          >
                            {value}
                          </label>
                        </div>
                      ))}
                    </div>
                    <div className="comment-section">
                      <label>Additional notes/observations:</label>
                      <textarea
                        value={
                          comments[`${currentSection - 1}-${qIndex}`] || ""
                        }
                        onChange={(e) =>
                          handleCommentChange(
                            currentSection - 1,
                            qIndex,
                            e.target.value
                          )
                        }
                        placeholder="Enter additional observations or notes here..."
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </>
      )}

      <div className="navigation-buttons">
        {currentSection > 0 && (
          <button className="prev-button" onClick={prevSection}>
            Previous
          </button>
        )}

        {currentSection < sections.length ? (
          <button
            className="next-button"
            onClick={nextSection}
            disabled={currentSection === sections.length}
          >
            Next
          </button>
        ) : (
          <button
            className="submit-button"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit Assessment"}
          </button>
        )}
      </div>

      {error && <p className="error-message">{error}</p>}
    </div>
  );
};

export default AssessmentForm;
