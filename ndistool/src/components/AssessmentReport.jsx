// src/components/AssessmentReport.js
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { useReactToPrint } from "react-to-print";
import "../styles/AssessmentReport.css";

const API_URL = import.meta.env.VITE_APP_API_URL || "http://localhost:5000";

const AssessmentReport = () => {
  const { assessmentId } = useParams();
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reportRef = React.useRef();

  const handlePrint = useReactToPrint({
    content: () => reportRef.current,
  });

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${API_URL}/api/assessments/${assessmentId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data.success) {
          setAssessment(response.data.assessment);
        } else {
          setError("Failed to load assessment data.");
        }
      } catch (err) {
        setError("An error occurred while fetching the assessment.");
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [assessmentId]);

  if (loading) {
    return <div className="loading">Loading assessment data...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!assessment) {
    return <div className="not-found">Assessment not found</div>;
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getScoreColor = (score) => {
    if (score <= 2) return "score-strength";
    if (score === 3) return "score-neutral";
    return "score-support";
  };

  const getSectionAverage = (sectionIndex) => {
    let sum = 0;
    let count = 0;

    for (const key in assessment.responses) {
      if (key.startsWith(`${sectionIndex}-`)) {
        sum += assessment.responses[key];
        count++;
      }
    }

    return count > 0 ? (sum / count).toFixed(1) : "N/A";
  };

  const renderStrengthsAndNeeds = () => {
    const strengths = [];
    const needs = [];

    assessment.questions.forEach((q) => {
      const response =
        assessment.responses[`${q.sectionIndex}-${q.questionIndex}`];

      if (response <= 2) {
        strengths.push({
          section: assessment.sectionTitles[q.sectionIndex],
          question: q.text,
          rating: response,
        });
      } else if (response >= 4) {
        needs.push({
          section: assessment.sectionTitles[q.sectionIndex],
          question: q.text,
          rating: response,
        });
      }
    });

    return (
      <div className="strengths-needs-container">
        <div className="strengths-container">
          <h3>Key Strengths</h3>
          {strengths.length > 0 ? (
            <ul>
              {strengths.map((item, index) => (
                <li key={`strength-${index}`}>
                  <strong>{item.section}:</strong> {item.question} (Rating:{" "}
                  {item.rating})
                </li>
              ))}
            </ul>
          ) : (
            <p>No key strengths identified (ratings of 1-2).</p>
          )}
        </div>

        <div className="needs-container">
          <h3>Areas Requiring Support</h3>
          {needs.length > 0 ? (
            <ul>
              {needs.map((item, index) => (
                <li key={`need-${index}`}>
                  <strong>{item.section}:</strong> {item.question} (Rating:{" "}
                  {item.rating})
                </li>
              ))}
            </ul>
          ) : (
            <p>No areas requiring support identified (ratings of 4-5).</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="report-page">
      <div className="report-actions">
        <button onClick={handlePrint} className="print-button">
          Print Report
        </button>
        <Link to="/history" className="back-button">
          Back to History
        </Link>
      </div>

      <div className="assessment-report" ref={reportRef}>
        <div className="report-header">
          <h1>Strengths-Based Needs Assessment Report</h1>
          <div className="report-meta">
            <p>
              <strong>Date:</strong> {formatDate(assessment.date)}
            </p>
            <p>
              <strong>Assessment ID:</strong> {assessmentId}
            </p>
          </div>
        </div>

        <div className="participant-details">
          <h2>Participant Information</h2>
          <div className="details-grid">
            <div className="detail-item">
              <span className="label">Name:</span>
              <span className="value">
                {assessment.participantDetails.fullName}
              </span>
            </div>
            <div className="detail-item">
              <span className="label">NDIS Number:</span>
              <span className="value">
                {assessment.participantDetails.ndisNumber}
              </span>
            </div>
            <div className="detail-item">
              <span className="label">Date of Birth:</span>
              <span className="value">
                {assessment.participantDetails.dateOfBirth}
              </span>
            </div>
            <div className="detail-item">
              <span className="label">Contact Number:</span>
              <span className="value">
                {assessment.participantDetails.contactNumber}
              </span>
            </div>
            <div className="detail-item">
              <span className="label">Email:</span>
              <span className="value">
                {assessment.participantDetails.email}
              </span>
            </div>
            <div className="detail-item">
              <span className="label">Address:</span>
              <span className="value">
                {assessment.participantDetails.address}
              </span>
            </div>
          </div>
        </div>

        <div className="summary-section">
          <h2>Assessment Summary</h2>
          <div className="summary-box">
            <div className="score-summary">
              <div className="total-score">
                <span className="score-label">Total Score:</span>
                <span className="score-value">{assessment.totalScore}</span>
              </div>
              <div className="interpretation">
                <span className="interpretation-label">Interpretation:</span>
                <span className="interpretation-value">
                  {assessment.interpretation}
                </span>
              </div>
            </div>

            <div className="section-scores">
              <h3>Section Averages</h3>
              <div className="section-score-grid">
                {assessment.sectionTitles.map((title, index) => (
                  <div key={index} className="section-score-item">
                    <span className="section-title">{title}:</span>
                    <span
                      className={`section-average ${getScoreColor(
                        parseFloat(getSectionAverage(index))
                      )}`}
                    >
                      {getSectionAverage(index)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {renderStrengthsAndNeeds()}

        <div className="detailed-responses">
          <h2>Detailed Assessment Responses</h2>

          {assessment.sectionTitles.map((sectionTitle, sectionIndex) => (
            <div key={sectionIndex} className="section-detail">
              <h3>{sectionTitle}</h3>
              <table className="responses-table">
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Rating</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {assessment.questions
                    .filter((q) => q.sectionIndex === sectionIndex)
                    .map((q) => (
                      <tr key={`${q.sectionIndex}-${q.questionIndex}`}>
                        <td>{q.text}</td>
                        <td
                          className={getScoreColor(
                            assessment.responses[
                              `${q.sectionIndex}-${q.questionIndex}`
                            ]
                          )}
                        >
                          {
                            assessment.responses[
                              `${q.sectionIndex}-${q.questionIndex}`
                            ]
                          }
                        </td>
                        <td>
                          {assessment.comments[
                            `${q.sectionIndex}-${q.questionIndex}`
                          ] || "-"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div className="recommendations">
          <h2>Recommendations & Next Steps</h2>
          <p>
            Based on this assessment, the following recommendations are provided
            to support the participant's goals and strengthen their
            independence:
          </p>

          <div className="recommendations-content">
            {/* This would be auto-generated or completed by an assessor */}
            <p>
              <em>
                This section is to be completed by the NDIS assessor based on
                the assessment results.
              </em>
            </p>
          </div>

          <div className="signatures">
            <div className="signature-block">
              <div className="signature-line">__________________________</div>
              <div className="signature-label">Assessor Signature</div>
            </div>
            <div className="signature-block">
              <div className="signature-line">__________________________</div>
              <div className="signature-label">Participant Signature</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentReport;
