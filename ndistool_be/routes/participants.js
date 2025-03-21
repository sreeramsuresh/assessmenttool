// routes/participants.js
const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const Participant = require("../models/Participant");
const Assessment = require("../models/Assessment");
const auth = require("../middleware/auth");

// @route   GET api/participants
// @desc    Get all participants
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    // Build query
    let query = {};

    // Search functionality
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query = {
        $or: [{ fullName: searchRegex }, { ndisNumber: searchRegex }],
      };
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const participants = await Participant.find(query)
      .sort({ fullName: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Participant.countDocuments(query);

    res.json({
      success: true,
      participants,
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

// @route   GET api/participants/:id
// @desc    Get participant by ID
// @access  Private
router.get("/:id", auth, async (req, res) => {
  try {
    const participant = await Participant.findById(req.params.id);

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: "Participant not found",
      });
    }

    res.json({
      success: true,
      participant,
    });
  } catch (err) {
    console.error(err.message);

    // Check for invalid ObjectId
    if (err.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Participant not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   POST api/participants
// @desc    Create a new participant
// @access  Private
router.post(
  "/",
  [
    auth,
    [
      check("fullName", "Full name is required").not().isEmpty(),
      check("ndisNumber", "NDIS number is required").not().isEmpty(),
      check("dateOfBirth", "Date of birth is required").not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const {
      fullName,
      ndisNumber,
      dateOfBirth,
      contactNumber,
      email,
      address,
      notes,
    } = req.body;

    try {
      // Check if participant with NDIS number already exists
      let participant = await Participant.findOne({ ndisNumber });

      if (participant) {
        return res.status(400).json({
          success: false,
          message: "Participant with this NDIS number already exists",
        });
      }

      // Create new participant
      participant = new Participant({
        fullName,
        ndisNumber,
        dateOfBirth,
        contactNumber,
        email,
        address,
        notes,
        createdBy: req.user.id,
      });

      await participant.save();

      res.json({
        success: true,
        message: "Participant created successfully",
        participant,
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

// @route   PUT api/participants/:id
// @desc    Update participant
// @access  Private
router.put(
  "/:id",
  [
    auth,
    [
      check("fullName", "Full name is required").not().isEmpty(),
      check("ndisNumber", "NDIS number is required").not().isEmpty(),
      check("dateOfBirth", "Date of birth is required").not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const {
      fullName,
      ndisNumber,
      dateOfBirth,
      contactNumber,
      email,
      address,
      notes,
    } = req.body;

    try {
      let participant = await Participant.findById(req.params.id);

      if (!participant) {
        return res.status(404).json({
          success: false,
          message: "Participant not found",
        });
      }

      // If NDIS number is changing, check it's not already in use
      if (ndisNumber !== participant.ndisNumber) {
        const existingParticipant = await Participant.findOne({ ndisNumber });

        if (
          existingParticipant &&
          existingParticipant._id.toString() !== req.params.id
        ) {
          return res.status(400).json({
            success: false,
            message: "Participant with this NDIS number already exists",
          });
        }
      }

      // Update participant
      participant = await Participant.findByIdAndUpdate(
        req.params.id,
        {
          fullName,
          ndisNumber,
          dateOfBirth,
          contactNumber,
          email,
          address,
          notes,
        },
        { new: true }
      );

      res.json({
        success: true,
        message: "Participant updated successfully",
        participant,
      });
    } catch (err) {
      console.error(err.message);

      // Check for invalid ObjectId
      if (err.kind === "ObjectId") {
        return res.status(404).json({
          success: false,
          message: "Participant not found",
        });
      }

      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// @route   DELETE api/participants/:id
// @desc    Delete participant
// @access  Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const participant = await Participant.findById(req.params.id);

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: "Participant not found",
      });
    }

    // Check if participant has assessments
    const assessmentCount = await Assessment.countDocuments({
      "participantDetails.ndisNumber": participant.ndisNumber,
    });

    if (assessmentCount > 0) {
      // Inform the client about existing assessments
      return res.json({
        success: true,
        message: `Participant deleted successfully. Note: ${assessmentCount} related assessments are preserved.`,
      });
    }

    // Delete participant
    await participant.remove();

    res.json({
      success: true,
      message: "Participant deleted successfully",
    });
  } catch (err) {
    console.error(err.message);

    // Check for invalid ObjectId
    if (err.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Participant not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   GET api/participants/search/:term
// @desc    Search participants
// @access  Private
router.get("/search/:term", auth, async (req, res) => {
  try {
    const searchTerm = req.params.term;
    const searchRegex = new RegExp(searchTerm, "i");

    const participants = await Participant.find({
      $or: [{ fullName: searchRegex }, { ndisNumber: searchRegex }],
    }).limit(10);

    res.json({
      success: true,
      participants,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   GET api/participants/ndis/:ndisNumber
// @desc    Get participant by NDIS number
// @access  Private
router.get("/ndis/:ndisNumber", auth, async (req, res) => {
  try {
    const participant = await Participant.findOne({
      ndisNumber: req.params.ndisNumber,
    });

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: "Participant not found",
      });
    }

    res.json({
      success: true,
      participant,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   PUT api/participants/:id/update-assessment
// @desc    Update participant's last assessment info
// @access  Private
router.put("/:id/update-assessment", auth, async (req, res) => {
  try {
    const { assessmentId, date, totalScore, interpretation } = req.body;

    if (!assessmentId || !date || totalScore === undefined || !interpretation) {
      return res.status(400).json({
        success: false,
        message: "Missing required assessment information",
      });
    }

    const participant = await Participant.findById(req.params.id);

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: "Participant not found",
      });
    }

    // Update last assessment info
    participant.lastAssessment = {
      date,
      totalScore,
      interpretation,
      assessmentId,
    };

    await participant.save();

    res.json({
      success: true,
      message: "Participant last assessment updated",
      participant,
    });
  } catch (err) {
    console.error(err.message);

    // Check for invalid ObjectId
    if (err.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Participant not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   GET api/participants/stats
// @desc    Get participant statistics
// @access  Private
router.get("/stats", auth, async (req, res) => {
  try {
    // Get total participants count
    const totalParticipants = await Participant.countDocuments();

    // Get participants with assessments
    const participantsWithAssessments = await Participant.countDocuments({
      "lastAssessment.assessmentId": { $exists: true },
    });

    // Get participants without assessments
    const participantsWithoutAssessments =
      totalParticipants - participantsWithAssessments;

    // Get recently added participants (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentParticipants = await Participant.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Get participant age distributions
    const today = new Date();

    const ageGroups = [
      { name: "0-17", count: 0, min: 0, max: 17 },
      { name: "18-24", count: 0, min: 18, max: 24 },
      { name: "25-49", count: 0, min: 25, max: 49 },
      { name: "50-64", count: 0, min: 50, max: 64 },
      { name: "65+", count: 0, min: 65, max: 200 },
    ];

    const allParticipants = await Participant.find({}, "dateOfBirth");

    allParticipants.forEach((participant) => {
      const birthDate = new Date(participant.dateOfBirth);
      const age = today.getFullYear() - birthDate.getFullYear();

      // Adjust age if birthday hasn't occurred yet this year
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }

      // Add to appropriate age group
      for (const group of ageGroups) {
        if (age >= group.min && age <= group.max) {
          group.count++;
          break;
        }
      }
    });

    res.json({
      success: true,
      stats: {
        totalParticipants,
        participantsWithAssessments,
        participantsWithoutAssessments,
        recentParticipants,
        ageDistribution: ageGroups,
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

module.exports = router;
