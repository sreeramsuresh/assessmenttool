// routes/assessments.js
const express = require("express");
const router = express.Router();
const Assessment = require("../models/Assessment");
const User = require("../models/User");
const auth = require("../middleware/auth");
const { check, validationResult } = require("express-validator");
const mongoose = require("mongoose");

// @route   POST api/assessments
// @desc    Create a new assessment
// @access  Private
router.post(
  "/",
  [
    auth,
    [
      check(
        "participantDetails",
        "Participant details are required"
      ).notEmpty(),
      check(
        "participantDetails.fullName",
        "Participant name is required"
      ).notEmpty(),
      check(
        "participantDetails.ndisNumber",
        "NDIS number is required"
      ).notEmpty(),
      check("responses", "Responses are required").notEmpty(),
      check("totalScore", "Total score is required").isNumeric(),
      check("interpretation", "Interpretation is required").notEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const {
        participantDetails,
        responses,
        comments,
        totalScore,
        interpretation,
        sectionTitles,
        questions,
      } = req.body;

      // Create new assessment
      const newAssessment = new Assessment({
        participantDetails,
        responses,
        comments,
        totalScore,
        interpretation,
        sectionTitles,
        questions,
        assessor: req.user.id,
      });

      const assessment = await newAssessment.save();

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

// @route   GET api/assessments/:id
// @desc    Get assessment by ID
// @access  Private
router.get("/:id", auth, async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
      });
    }

    // Check if user is authorized to view this assessment
    // Admins and supervisors can view all assessments, assessors can only view their own
    if (
      req.user.role === "assessor" &&
      assessment.assessor.toString() !== req.user.id
    ) {
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

    // If assessor, only show their assessments
    if (req.user.role === "assessor") {
      query.assessor = req.user.id;
    }

    // Add filters from query parameters
    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.participantId) {
      query["participantDetails.ndisNumber"] = req.query.participantId;
    }

    // Date range filter
    if (req.query.startDate && req.query.endDate) {
      query.date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const assessments = await Assessment.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .populate("assessor", "name");

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

// @route   GET api/assessments/recent
// @desc    Get recent assessments (last 5)
// @access  Private
router.get("/recent", auth, async (req, res) => {
  try {
    let query = {};

    // If assessor, only show their assessments
    if (req.user.role === "assessor") {
      query.assessor = req.user.id;
    }

    const assessments = await Assessment.find(query)
      .sort({ date: -1 })
      .limit(5)
      .populate("assessor", "name");

    res.json({
      success: true,
      assessments,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   GET api/assessments/participant/:ndisNumber
// @desc    Get all assessments for a participant by NDIS number
// @access  Private
router.get("/participant/:ndisNumber", auth, async (req, res) => {
  try {
    let query = {
      "participantDetails.ndisNumber": req.params.ndisNumber,
    };

    // If assessor, only show their assessments
    if (req.user.role === "assessor") {
      query.assessor = req.user.id;
    }

    const assessments = await Assessment.find(query)
      .sort({ date: -1 })
      .populate("assessor", "name");

    res.json({
      success: true,
      assessments,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   GET api/assessments/stats
// @desc    Get assessment statistics
// @access  Private
router.get("/stats", auth, async (req, res) => {
  try {
    let query = {};

    // If assessor, only show their assessments
    if (req.user.role === "assessor") {
      query.assessor = req.user.id;
    }

    // Get counts by status
    const total = await Assessment.countDocuments(query);
    const completed = await Assessment.countDocuments({
      ...query,
      status: "Completed",
    });
    const pendingReview = await Assessment.countDocuments({
      ...query,
      status: "Pending Review",
    });
    const reviewed = await Assessment.countDocuments({
      ...query,
      status: "Reviewed",
    });

    // Get assessment count by month (last 6 months)
    const today = new Date();
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

    const monthlyStats = await Assessment.aggregate([
      {
        $match: {
          ...query,
          date: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    // Format monthly stats for frontend
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const monthlyData = [];

    for (let i = 0; i < 6; i++) {
      const targetMonth = new Date(
        today.getFullYear(),
        today.getMonth() - 5 + i,
        1
      );
      const targetYear = targetMonth.getFullYear();
      const targetMonthNum = targetMonth.getMonth() + 1;

      const found = monthlyStats.find(
        (stat) =>
          stat._id.year === targetYear && stat._id.month === targetMonthNum
      );

      monthlyData.push({
        month: monthNames[targetMonth.getMonth()],
        year: targetYear,
        count: found ? found.count : 0,
      });
    }

    // Calculate section averages
    const sectionAverages = [];

    // Get all assessments to calculate section averages
    const allAssessments = await Assessment.find(query);

    // Check if there are any assessments
    if (allAssessments.length > 0 && allAssessments[0].sectionTitles) {
      // Get section titles from the first assessment (assuming all have the same structure)
      const sectionTitles = allAssessments[0].sectionTitles;

      for (
        let sectionIndex = 0;
        sectionIndex < sectionTitles.length;
        sectionIndex++
      ) {
        let sum = 0;
        let count = 0;

        // Calculate average for each section across all assessments
        allAssessments.forEach((assessment) => {
          for (const key in assessment.responses) {
            if (key.startsWith(`${sectionIndex}-`)) {
              sum += assessment.responses[key];
              count++;
            }
          }
        });

        sectionAverages.push({
          name: sectionTitles[sectionIndex],
          average: count > 0 ? parseFloat((sum / count).toFixed(1)) : 0,
        });
      }
    }

    res.json({
      success: true,
      stats: {
        total,
        completed,
        pendingReview,
        reviewed,
        monthly: monthlyData,
        sectionAverages,
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

// @route   PUT api/assessments/:id
// @desc    Update assessment
// @access  Private
router.get("/:id", auth, async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
      });
    }

    // Check if user is authorized to update this assessment
    if (
      req.user.role === "assessor" &&
      assessment.assessor.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this assessment",
      });
    }

    // Update fields from request body
    const {
      participantDetails,
      responses,
      comments,
      totalScore,
      interpretation,
      status,
      recommendationsNotes,
    } = req.body;

    if (participantDetails) assessment.participantDetails = participantDetails;
    if (responses) assessment.responses = responses;
    if (comments) assessment.comments = comments;
    if (totalScore) assessment.totalScore = totalScore;
    if (interpretation) assessment.interpretation = interpretation;
    if (status) assessment.status = status;
    if (recommendationsNotes)
      assessment.recommendationsNotes = recommendationsNotes;

    await assessment.save();

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
});

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
    // Only admins or the original assessor can delete
    if (
      req.user.role !== "admin" &&
      assessment.assessor.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this assessment",
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

// @route   POST api/assessments/:id/report
// @desc    Generate PDF report for an assessment
// @access  Private
router.post("/:id/report", auth, async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id).populate(
      "assessor",
      "name organization position"
    );

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
      });
    }

    // Check if user is authorized to view this assessment
    if (
      req.user.role === "assessor" &&
      assessment.assessor._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to generate report for this assessment",
      });
    }

    // Import the report generator utility
    const { generatePDF } = require("../utils/reportGenerator");

    // Generate the PDF
    const pdfPath = await generatePDF(assessment, assessment.assessor);

    // Set headers for file download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=assessment-${assessment._id}.pdf`
    );

    // Stream the file to the client
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

    // Clean up the temporary file when done
    fileStream.on("end", () => {
      fs.unlinkSync(pdfPath);
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
