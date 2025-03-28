// routes/assessments.js
const express = require("express");
const router = express.Router();
const Assessment = require("../models/Assessment");
const User = require("../models/User");
const Assignment = require("../models/Assignment");
const auth = require("../middleware/auth");
const { checkPermission } = require("../middleware/roleAuth");
const { check, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// @route   POST api/assessments
// @desc    Create a new assessment
// @access  Private
router.post(
  "/",
  [
    auth,
    checkPermission("CREATE_ASSESSMENT"),
    [
      check("participant", "Participant is required").notEmpty(),
      check(
        "selectedSections",
        "At least one section must be selected"
      ).isArray({ min: 1 }),
      check("questions", "Questions are required").isArray({ min: 1 }),
      check("sectionTitles", "Section titles are required").isArray({ min: 1 }),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const {
        participant,
        selectedSections,
        questions,
        sectionTitles,
        customQuestions,
        dueDate,
        assignmentId,
      } = req.body;

      // Check if participant exists
      const participantUser = await User.findById(participant);
      if (!participantUser) {
        return res.status(404).json({
          success: false,
          message: "Participant not found",
        });
      }

      // Create initial empty assessment
      const newAssessment = new Assessment({
        participant,
        selectedSections,
        responses: new Map(), // Will be filled by the participant
        comments: new Map(),
        sectionTitles,
        questions,
        totalScore: 0, // Will be calculated when completed
        interpretation: "", // Will be filled when completed
        assessor: req.user.id,
        status: "Draft",
      });

      // Add assignment ID if provided
      if (assignmentId) {
        newAssessment.assignmentId = assignmentId;

        // Get assignment to update it later
        const assignment = await Assignment.findById(assignmentId);
        if (assignment) {
          newAssessment.assignedBy = assignment.supervisor;
        }
      }

      // Add custom questions if provided
      if (customQuestions && customQuestions.length > 0) {
        newAssessment.customQuestions = customQuestions.map((q) => ({
          ...q,
          createdBy: req.user.id,
        }));
      }

      // Add due date if provided
      if (dueDate) {
        newAssessment.dueDate = dueDate;
      }

      const assessment = await newAssessment.save();

      // Update assignment if applicable
      if (assignmentId) {
        await Assignment.findByIdAndUpdate(assignmentId, {
          $push: { assessments: assessment._id },
          $set: {
            lastActivity: new Date(),
            lastActivityBy: req.user.id,
            lastActivityType: "assessment_created",
          },
        });
      }

      res.json({
        success: true,
        message: "Assessment created successfully",
        assessmentId: assessment._id,
      });
    } catch (err) {
      console.error("Assessment creation error:", err.message);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// @route   POST api/assessments/:id/assign
// @desc    Assign assessment to participant
// @access  Private
router.post(
  "/:id/assign",
  [auth, checkPermission("UPDATE_OWN_ASSESSMENTS")],
  async (req, res) => {
    try {
      const assessment = await Assessment.findById(req.params.id);

      if (!assessment) {
        return res.status(404).json({
          success: false,
          message: "Assessment not found",
        });
      }

      // Check if user is authorized to assign this assessment
      if (
        req.user.role === "assessor" &&
        assessment.assessor.toString() !== req.user.id
      ) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to assign this assessment",
        });
      }

      // Make sure assessment is in Draft status
      if (assessment.status !== "Draft") {
        return res.status(400).json({
          success: false,
          message: `Cannot assign assessment that is in ${assessment.status} status`,
        });
      }

      // Update assessment status and timestamps
      assessment.status = "Assigned";
      assessment.assignedDate = new Date();
      assessment.assignedBy = req.user.id;

      // Add history entry
      assessment.history.push({
        action: "assigned",
        user: req.user.id,
        details: "Assessment assigned to participant",
        timestamp: new Date(),
      });

      await assessment.save();

      // Get participant user to send notification
      const participant = await User.findById(assessment.participant);
      if (participant) {
        await participant.addNotification(
          "You have been assigned a new assessment",
          "assignment",
          `/assessments/${assessment._id}`
        );
      }

      // Update assignment if applicable
      if (assessment.assignmentId) {
        await Assignment.findByIdAndUpdate(assessment.assignmentId, {
          $set: {
            lastActivity: new Date(),
            lastActivityBy: req.user.id,
            lastActivityType: "assessment_assigned",
          },
        });
      }

      res.json({
        success: true,
        message: "Assessment assigned successfully",
        assessment,
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// @route   POST api/assessments/:id/start
// @desc    Start an assigned assessment (participant only)
// @access  Private
router.post(
  "/:id/start",
  [auth, checkPermission("TAKE_ASSESSMENT")],
  async (req, res) => {
    try {
      const assessment = await Assessment.findById(req.params.id);

      if (!assessment) {
        return res.status(404).json({
          success: false,
          message: "Assessment not found",
        });
      }

      // Check if user is the assigned participant
      if (assessment.participant.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to start this assessment",
        });
      }

      // Make sure assessment is in Assigned status
      if (assessment.status !== "Assigned") {
        return res.status(400).json({
          success: false,
          message: `Cannot start assessment that is in ${assessment.status} status`,
        });
      }

      // Update assessment status and timestamps
      assessment.status = "In Progress";
      assessment.startDate = new Date();

      // Add history entry
      assessment.history.push({
        action: "started",
        user: req.user.id,
        details: "Assessment started by participant",
        timestamp: new Date(),
      });

      await assessment.save();

      // Notify assessor
      const assessor = await User.findById(assessment.assessor);
      if (assessor) {
        await assessor.addNotification(
          "A participant has started their assessment",
          "info",
          `/assessments/${assessment._id}`
        );
      }

      // Update assignment if applicable
      if (assessment.assignmentId) {
        await Assignment.findByIdAndUpdate(assessment.assignmentId, {
          $set: {
            lastActivity: new Date(),
            lastActivityBy: req.user.id,
            lastActivityType: "assessment_started",
          },
        });
      }

      res.json({
        success: true,
        message: "Assessment started successfully",
        assessment,
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// @route   POST api/assessments/:id/submit
// @desc    Submit completed assessment (participant only)
// @access  Private
router.post(
  "/:id/submit",
  [
    auth,
    checkPermission("TAKE_ASSESSMENT"),
    [check("responses", "Responses are required").notEmpty()],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const assessment = await Assessment.findById(req.params.id);

      if (!assessment) {
        return res.status(404).json({
          success: false,
          message: "Assessment not found",
        });
      }

      // Check if user is the assigned participant
      if (assessment.participant.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to submit this assessment",
        });
      }

      // Make sure assessment is in In Progress status
      if (assessment.status !== "In Progress") {
        return res.status(400).json({
          success: false,
          message: `Cannot submit assessment that is in ${assessment.status} status`,
        });
      }

      const { responses, comments } = req.body;

      // Calculate total score
      let totalScore = 0;
      let responseCount = 0;

      for (const key in responses) {
        totalScore += responses[key];
        responseCount++;
      }

      const averageScore =
        responseCount > 0
          ? parseFloat((totalScore / responseCount).toFixed(2))
          : 0;

      // Generate interpretation based on average score
      let interpretation = "";
      if (averageScore <= 2) {
        interpretation = "Significant strengths - requires minimal support";
      } else if (averageScore <= 3) {
        interpretation = "Moderate strengths - requires some support";
      } else if (averageScore <= 4) {
        interpretation = "Some challenges - requires moderate support";
      } else {
        interpretation =
          "Significant challenges - requires substantial support";
      }

      // Update assessment with responses and calculated values
      assessment.responses = responses;
      assessment.comments = comments || {};
      assessment.totalScore = averageScore;
      assessment.interpretation = interpretation;
      assessment.status = "Completed";
      assessment.completionDate = new Date();

      // Add history entry
      assessment.history.push({
        action: "completed",
        user: req.user.id,
        details: "Assessment completed by participant",
        timestamp: new Date(),
      });

      await assessment.save();

      // Notify assessor
      const assessor = await User.findById(assessment.assessor);
      if (assessor) {
        await assessor.addNotification(
          "A participant has completed their assessment",
          "success",
          `/assessments/${assessment._id}`
        );
      }

      // Update assignment if applicable
      if (assessment.assignmentId) {
        await Assignment.findByIdAndUpdate(assessment.assignmentId, {
          $set: {
            lastActivity: new Date(),
            lastActivityBy: req.user.id,
            lastActivityType: "assessment_completed",
          },
        });
      }

      res.json({
        success: true,
        message: "Assessment submitted successfully",
        assessment,
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// @route   POST api/assessments/:id/review
// @desc    Submit assessment review (assessor only)
// @access  Private
router.post(
  "/:id/review",
  [
    auth,
    checkPermission("UPDATE_OWN_ASSESSMENTS"),
    [check("reviewNotes", "Review notes are required").notEmpty()],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const assessment = await Assessment.findById(req.params.id);

      if (!assessment) {
        return res.status(404).json({
          success: false,
          message: "Assessment not found",
        });
      }

      // Check if user is authorized to review this assessment
      if (
        req.user.role === "assessor" &&
        assessment.assessor.toString() !== req.user.id
      ) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to review this assessment",
        });
      }

      // Make sure assessment is in Completed status
      if (
        assessment.status !== "Completed" &&
        assessment.status !== "Pending Review"
      ) {
        return res.status(400).json({
          success: false,
          message: `Cannot review assessment that is in ${assessment.status} status`,
        });
      }

      const { reviewNotes, recommendationsNotes } = req.body;

      // Update assessment with review details
      assessment.reviewNotes = reviewNotes;
      assessment.recommendationsNotes = recommendationsNotes || "";
      assessment.status = "Reviewed";
      assessment.reviewDate = new Date();
      assessment.reviewedBy = req.user.id;

      // Add history entry
      assessment.history.push({
        action: "reviewed",
        user: req.user.id,
        details: "Assessment reviewed",
        timestamp: new Date(),
      });

      await assessment.save();

      // Notify participant
      const participant = await User.findById(assessment.participant);
      if (participant) {
        await participant.addNotification(
          "Your assessment has been reviewed",
          "info",
          `/assessments/${assessment._id}`
        );
      }

      // Update assignment if applicable
      if (assessment.assignmentId) {
        await Assignment.findByIdAndUpdate(assessment.assignmentId, {
          $set: {
            lastActivity: new Date(),
            lastActivityBy: req.user.id,
            lastActivityType: "assessment_reviewed",
            status: "completed",
          },
        });
      }

      res.json({
        success: true,
        message: "Assessment reviewed successfully",
        assessment,
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// @route   GET api/assessments/:id
// @desc    Get assessment by ID
// @access  Private
router.get("/:id", auth, async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id)
      .populate("assessor", "name email organization position")
      .populate(
        "participant",
        "name email ndisNumber dateOfBirth contactNumber address"
      )
      .populate("reviewedBy", "name organization");

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
      });
    }

    // Check if user is authorized to view this assessment
    const isAuthorized =
      req.user.role === "admin" ||
      req.user.role === "supervisor" ||
      assessment.assessor._id.toString() === req.user.id ||
      (assessment.participant &&
        assessment.participant._id.toString() === req.user.id);

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this assessment",
      });
    }

    res.json({
      success: true,
      assessment,
    });
  } catch (err) {
    console.error(err.message);

    // Check for invalid ObjectId
    if (err.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   GET api/assessments
// @desc    Get all assessments for the user (or all if admin/supervisor)
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    let query = {};

    // Filter based on user role
    if (req.user.role === "assessor") {
      query.assessor = req.user.id;
    } else if (req.user.role === "participant") {
      query.participant = req.user.id;
    }

    // Add filters from query parameters
    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.participantId) {
      query.participant = req.query.participantId;
    }

    if (req.query.assessorId) {
      query.assessor = req.query.assessorId;
    }

    // Date range filter
    if (req.query.startDate && req.query.endDate) {
      query.date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    }

    // Assignment filter
    if (req.query.assignmentId) {
      query.assignmentId = req.query.assignmentId;
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const assessments = await Assessment.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .populate("assessor", "name")
      .populate("participant", "name ndisNumber");

    const total = await Assessment.countDocuments(query);

    res.json({
      success: true,
      assessments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   GET api/assessments/dashboard
// @desc    Get assessments for dashboard
// @access  Private
router.get("/dashboard/summary", auth, async (req, res) => {
  try {
    let query = {};

    // Filter based on user role
    if (req.user.role === "assessor") {
      query.assessor = req.user.id;
    } else if (req.user.role === "participant") {
      query.participant = req.user.id;
    }

    // Count assessments by status
    const totalAssessments = await Assessment.countDocuments(query);
    const draftAssessments = await Assessment.countDocuments({
      ...query,
      status: "Draft",
    });
    const assignedAssessments = await Assessment.countDocuments({
      ...query,
      status: "Assigned",
    });
    const inProgressAssessments = await Assessment.countDocuments({
      ...query,
      status: "In Progress",
    });
    const completedAssessments = await Assessment.countDocuments({
      ...query,
      status: "Completed",
    });
    const reviewedAssessments = await Assessment.countDocuments({
      ...query,
      status: "Reviewed",
    });

    // Get recent assessments
    const recentAssessments = await Assessment.find(query)
      .sort({ date: -1 })
      .limit(5)
      .populate("assessor", "name")
      .populate("participant", "name ndisNumber");

    // Due soon (for assessors)
    let dueSoonAssessments = [];
    if (
      req.user.role === "assessor" ||
      req.user.role === "supervisor" ||
      req.user.role === "admin"
    ) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      dueSoonAssessments = await Assessment.find({
        ...query,
        dueDate: { $lte: nextWeek, $gte: new Date() },
        status: { $in: ["Draft", "Assigned", "In Progress"] },
      })
        .sort({ dueDate: 1 })
        .limit(5)
        .populate("participant", "name ndisNumber");
    }

    res.json({
      success: true,
      summary: {
        counts: {
          total: totalAssessments,
          draft: draftAssessments,
          assigned: assignedAssessments,
          inProgress: inProgressAssessments,
          completed: completedAssessments,
          reviewed: reviewedAssessments,
        },
        recentAssessments,
        dueSoonAssessments,
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   GET api/assessments/sections
// @desc    Get standard assessment sections
// @access  Private
router.get("/sections/standard", auth, async (req, res) => {
  try {
    // Standard sections with sample questions
    const standardSections = [
      {
        id: 0,
        title: "Personal Care & Daily Living Strengths",
        description:
          "Assesses abilities in personal hygiene, dressing, meal preparation, and other daily living activities.",
        questions: [
          "Can independently manage personal hygiene",
          "Can dress themselves appropriately for different situations",
          "Can prepare simple meals",
          "Can perform basic household tasks (cleaning, laundry)",
          "Can manage medication independently",
        ],
      },
      {
        id: 1,
        title: "Mobility & Accessibility Strengths",
        description:
          "Evaluates mobility capabilities, transport use, and navigation in various environments.",
        questions: [
          "Can move around home independently",
          "Can access public transportation",
          "Can navigate unfamiliar environments",
          "Can manage stairs and uneven surfaces",
          "Can use mobility aids effectively (if required)",
        ],
      },
      {
        id: 2,
        title: "Communication & Social Strengths",
        description:
          "Assesses communication skills, social interactions, and relationship building.",
        questions: [
          "Can express needs and wants clearly",
          "Can engage in two-way conversations",
          "Can form and maintain relationships",
          "Can understand social cues and norms",
          "Can use communication technology (phone, computer)",
        ],
      },
      {
        id: 3,
        title: "Learning, Employment & Education Strengths",
        description:
          "Evaluates learning abilities, educational engagement, and vocational skills.",
        questions: [
          "Can learn new skills with support",
          "Can focus on tasks for extended periods",
          "Can follow multi-step instructions",
          "Can set and work toward goals",
          "Can engage effectively in work or educational settings",
        ],
      },
      {
        id: 4,
        title: "Health & Well-being Strengths",
        description:
          "Assesses health management, emotional wellbeing, and self-care practices.",
        questions: [
          "Can recognize and communicate health concerns",
          "Can implement healthy lifestyle choices",
          "Can manage stress effectively",
          "Can identify and express emotions",
          "Can participate in recreational activities",
        ],
      },
      {
        id: 5,
        title: "Safety & Independence Strengths",
        description:
          "Evaluates safety awareness, decision making, and independent living skills.",
        questions: [
          "Can identify and respond to safety risks",
          "Can make appropriate decisions in daily life",
          "Can manage personal finances",
          "Can handle emergency situations",
          "Can advocate for personal needs",
        ],
      },
    ];

    res.json({
      success: true,
      sections: standardSections,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   PUT api/assessments/:id
// @desc    Update assessment
// @access  Private
router.put(
  "/:id",
  [
    auth,
    [
      check("selectedSections", "At least one section must be selected")
        .optional()
        .isArray({ min: 1 }),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const assessment = await Assessment.findById(req.params.id);

      if (!assessment) {
        return res.status(404).json({
          success: false,
          message: "Assessment not found",
        });
      }

      // Check if user is authorized to update this assessment
      const isAuthorized =
        req.user.role === "admin" ||
        req.user.role === "supervisor" ||
        assessment.assessor.toString() === req.user.id ||
        (req.user.role === "participant" &&
          assessment.participant.toString() === req.user.id &&
          ["Assigned", "In Progress"].includes(assessment.status));

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update this assessment",
        });
      }

      // Update fields from request body
      const {
        selectedSections,
        questions,
        customQuestions,
        responses,
        comments,
        dueDate,
        status,
        recommendationsNotes,
      } = req.body;

      // Only allow certain updates depending on user role and assessment status
      if (req.user.role === "participant") {
        // Participants can only update responses and comments
        if (responses) assessment.responses = responses;
        if (comments) assessment.comments = comments;
      } else {
        // Assessors, supervisors, and admins can update more fields
        if (selectedSections && assessment.status === "Draft") {
          assessment.selectedSections = selectedSections;
        }

        if (questions && assessment.status === "Draft") {
          assessment.questions = questions;
        }

        if (customQuestions && assessment.status === "Draft") {
          assessment.customQuestions = customQuestions.map((q) => ({
            ...q,
            createdBy: q.createdBy || req.user.id,
          }));
        }

        if (dueDate) assessment.dueDate = dueDate;
        if (recommendationsNotes)
          assessment.recommendationsNotes = recommendationsNotes;

        // Status changes should be handled by specific endpoints, but allow it here for admins
        if (status && req.user.role === "admin") {
          await assessment.updateStatus(
            status,
            req.user.id,
            "Status updated by admin"
          );
        }
      }

      // Add history entry
      assessment.history.push({
        action: "updated",
        user: req.user.id,
        details: "Assessment updated",
        timestamp: new Date(),
      });

      await assessment.save();

      // Update assignment if applicable
      if (assessment.assignmentId) {
        await Assignment.findByIdAndUpdate(assessment.assignmentId, {
          $set: {
            lastActivity: new Date(),
            lastActivityBy: req.user.id,
            lastActivityType: "assessment_updated",
          },
        });
      }

      res.json({
        success: true,
        message: "Assessment updated successfully",
        assessment,
      });
    } catch (err) {
      console.error(err.message);

      // Check for invalid ObjectId
      if (err.kind === "ObjectId") {
        return res.status(404).json({
          success: false,
          message: "Assessment not found",
        });
      }

      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// @route   DELETE api/assessments/:id
// @desc    Delete assessment
// @access  Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
      });
    }

    // Check if user is authorized to delete this assessment
    const isAuthorized =
      req.user.role === "admin" ||
      (req.user.role === "supervisor" && assessment.status === "Draft") ||
      (assessment.assessor.toString() === req.user.id &&
        assessment.status === "Draft");

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this assessment",
      });
    }

    // If the assessment is part of an assignment, update the assignment
    if (assessment.assignmentId) {
      await Assignment.findByIdAndUpdate(assessment.assignmentId, {
        $pull: { assessments: assessment._id },
        $set: {
          lastActivity: new Date(),
          lastActivityBy: req.user.id,
          lastActivityType: "assessment_deleted",
        },
      });
    }

    await assessment.deleteOne();

    res.json({
      success: true,
      message: "Assessment deleted successfully",
    });
  } catch (err) {
    console.error(err.message);

    // Check for invalid ObjectId
    if (err.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;
