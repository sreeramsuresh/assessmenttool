// middleware/participantAuth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Middleware to check if the user is a participant
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const participantAuth = async (req, res, next) => {
  try {
    // First, run the standard auth middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Check if user is a participant
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role !== "participant") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only participants can access this resource.",
      });
    }

    next();
  } catch (err) {
    console.error("Participant auth error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Middleware to check if the participant is assigned to the requested assessment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const checkAssessmentAssignment = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Get the assessment ID from the request parameters
    const assessmentId = req.params.id;
    if (!assessmentId) {
      return res.status(400).json({
        success: false,
        message: "Assessment ID is required",
      });
    }

    // Get the assessment
    const Assessment = require("../models/Assessment");
    const assessment = await Assessment.findById(assessmentId);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
      });
    }

    // Check if the participant is assigned to this assessment
    if (assessment.participant.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not assigned to this assessment.",
      });
    }

    next();
  } catch (err) {
    console.error("Assessment assignment check error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Middleware to check if the participant is assigned to the requested assignment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const checkAssignmentParticipant = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Get the assignment ID from the request parameters
    const assignmentId = req.params.id;
    if (!assignmentId) {
      return res.status(400).json({
        success: false,
        message: "Assignment ID is required",
      });
    }

    // Get the assignment
    const Assignment = require("../models/Assignment");
    const assignment = await Assignment.findById(assignmentId);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    // Check if the participant is assigned to this assignment
    if (assignment.participant.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not assigned to this assignment.",
      });
    }

    next();
  } catch (err) {
    console.error("Assignment participant check error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  participantAuth,
  checkAssessmentAssignment,
  checkAssignmentParticipant,
};
