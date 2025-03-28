// routes/participants.js
const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const Participant = require("../models/Participant");
const User = require("../models/User");
const Assessment = require("../models/Assessment");
const Assignment = require("../models/Assignment");
const auth = require("../middleware/auth");
const { checkPermission } = require("../middleware/roleAuth");

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

// @route   GET api/participants/with-accounts
// @desc    Get all participants with user accounts
// @access  Private
router.get("/with-accounts", auth, async (req, res) => {
  try {
    // Get all participants that have user accounts
    const participantUsers = await User.find({ role: "participant" }).select(
      "name email ndisNumber dateOfBirth contactNumber address"
    );

    res.json({
      success: true,
      participants: participantUsers,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   GET api/participants/without-accounts
// @desc    Get participants without user accounts
// @access  Private
router.get("/without-accounts", auth, async (req, res) => {
  try {
    // First get all NDIS numbers that already have user accounts
    const participantUsers = await User.find({ role: "participant" }).select(
      "ndisNumber"
    );

    const existingNdisNumbers = participantUsers.map((user) => user.ndisNumber);

    // Now find participants who don't have user accounts
    const query = {
      ndisNumber: { $nin: existingNdisNumbers },
    };

    // Search functionality
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query.$or = [{ fullName: searchRegex }, { ndisNumber: searchRegex }];
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

      // Also check if a user with this NDIS number exists
      const userWithNdisNumber = await User.findOne({ ndisNumber });
      if (userWithNdisNumber) {
        return res.status(400).json({
          success: false,
          message:
            "Participant user account with this NDIS number already exists",
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

        // Also check if a user with this NDIS number exists
        const userWithNdisNumber = await User.findOne({ ndisNumber });
        if (userWithNdisNumber) {
          return res.status(400).json({
            success: false,
            message:
              "Participant user account with this NDIS number already exists",
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
          updatedAt: new Date(),
        },
        { new: true }
      );

      // Check if this participant has a linked user account
      const linkedUser = await User.findOne({
        linkedParticipantId: participant._id,
      });

      if (linkedUser) {
        // Update linked user account with the same data
        linkedUser.name = fullName;
        linkedUser.ndisNumber = ndisNumber;
        linkedUser.dateOfBirth = dateOfBirth;
        linkedUser.contactNumber = contactNumber;
        linkedUser.address = address;

        // Only update email if it's provided and it's not already being used by another user
        if (email && email !== linkedUser.email) {
          const emailInUse = await User.findOne({
            email,
            _id: { $ne: linkedUser._id },
          });
          if (!emailInUse) {
            linkedUser.email = email;
          }
        }

        await linkedUser.save();
      }

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
      $or: [
        { "participantDetails.ndisNumber": participant.ndisNumber },
        { participant: participant._id },
      ],
    });

    // Check if participant has assignments
    const assignmentCount = await Assignment.countDocuments({
      participant: participant._id,
    });

    // Check if participant has a linked user account
    const linkedUser = await User.findOne({
      linkedParticipantId: participant._id,
    });

    if (assessmentCount > 0 || assignmentCount > 0 || linkedUser) {
      // Inform the client about existing relationships
      return res.status(400).json({
        success: false,
        message: `Cannot delete participant. The participant has ${assessmentCount} assessments, ${assignmentCount} assignments, and ${
          linkedUser ? "a linked user account" : "no linked user account"
        }.`,
      });
    }

    // Delete participant
    await participant.deleteOne();

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

    // Search in both participant collection and user collection (for participant users)
    const participantsPromise = Participant.find({
      $or: [{ fullName: searchRegex }, { ndisNumber: searchRegex }],
    }).limit(10);

    const participantUsersPromise = User.find({
      role: "participant",
      $or: [{ name: searchRegex }, { ndisNumber: searchRegex }],
    })
      .select("_id name ndisNumber dateOfBirth contactNumber address")
      .limit(10);

    const [participants, participantUsers] = await Promise.all([
      participantsPromise,
      participantUsersPromise,
    ]);

    // Format user results to match participant format
    const formattedUsers = participantUsers.map((user) => ({
      _id: user._id,
      fullName: user.name,
      ndisNumber: user.ndisNumber,
      dateOfBirth: user.dateOfBirth,
      contactNumber: user.contactNumber,
      address: user.address,
      isUser: true,
    }));

    // Combine results, removing duplicates (prioritize User entries)
    const usersNdisNumbers = new Set(formattedUsers.map((u) => u.ndisNumber));
    const filteredParticipants = participants.filter(
      (p) => !usersNdisNumbers.has(p.ndisNumber)
    );

    const combinedResults = [...formattedUsers, ...filteredParticipants];

    res.json({
      success: true,
      participants: combinedResults,
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
    // Check for participant user first
    const participantUser = await User.findOne({
      role: "participant",
      ndisNumber: req.params.ndisNumber,
    }).select("-password -notifications");

    if (participantUser) {
      return res.json({
        success: true,
        participant: {
          _id: participantUser._id,
          fullName: participantUser.name,
          ndisNumber: participantUser.ndisNumber,
          dateOfBirth: participantUser.dateOfBirth,
          contactNumber: participantUser.contactNumber,
          email: participantUser.email,
          address: participantUser.address,
          isUser: true,
        },
      });
    }

    // Then check for regular participant
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
      participant: {
        ...participant.toObject(),
        isUser: false,
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

// @route   GET api/participants/:id/assessments
// @desc    Get all assessments for a participant
// @access  Private
router.get("/:id/assessments", auth, async (req, res) => {
  try {
    const participantId = req.params.id;

    // Determine if this is a user ID or a participant record ID
    const participantUser = await User.findById(participantId).select(
      "ndisNumber role"
    );

    let query = {};

    if (participantUser && participantUser.role === "participant") {
      // This is a participant user - search by user ID
      query.participant = participantId;
    } else {
      // This is a regular participant record - search by NDIS number
      const participant = await Participant.findById(participantId);
      if (!participant) {
        return res.status(404).json({
          success: false,
          message: "Participant not found",
        });
      }

      query["participantDetails.ndisNumber"] = participant.ndisNumber;
    }

    // Check permissions
    if (req.user.role === "assessor") {
      query.assessor = req.user.id;
    }

    const assessments = await Assessment.find(query)
      .sort({ date: -1 })
      .populate("assessor", "name")
      .populate("participant", "name ndisNumber")
      .populate("reviewedBy", "name");

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

// @route   GET api/participants/:id/assignments
// @desc    Get all assignments for a participant
// @access  Private
router.get("/:id/assignments", auth, async (req, res) => {
  try {
    const participantId = req.params.id;

    // Determine if this is a user ID or a participant record ID
    const participantUser = await User.findById(participantId);

    let query = {};

    if (participantUser && participantUser.role === "participant") {
      // This is a participant user - search by user ID
      query.participant = participantId;
    } else {
      // This is not allowed - assignments must be with participant users
      return res.status(400).json({
        success: false,
        message: "Assignments can only be made with participant user accounts",
      });
    }

    // Check permissions
    if (req.user.role === "assessor") {
      query.assessor = req.user.id;
    }

    const assignments = await Assignment.find(query)
      .sort({ createdAt: -1 })
      .populate("supervisor", "name")
      .populate("assessor", "name")
      .populate("participant", "name ndisNumber")
      .populate({
        path: "assessments",
        select: "status date dueDate",
        options: { sort: { date: -1 } },
      });

    res.json({
      success: true,
      assignments,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   GET api/participants/stats
// @desc    Get participant statistics
// @access  Private
router.get("/stats/dashboard", auth, async (req, res) => {
  try {
    // Get participant counts
    const totalParticipantRecords = await Participant.countDocuments();
    const totalParticipantUsers = await User.countDocuments({
      role: "participant",
    });
    const totalParticipants = totalParticipantRecords + totalParticipantUsers;

    // Get participants with assessments
    const participantsWithAssessmentsCount = await Assessment.aggregate([
      { $group: { _id: "$participant", count: { $sum: 1 } } },
      { $count: "total" },
    ]);

    const participantsWithAssessments =
      participantsWithAssessmentsCount.length > 0
        ? participantsWithAssessmentsCount[0].total
        : 0;

    // Get recently added participants (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentParticipantRecords = await Participant.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    const recentParticipantUsers = await User.countDocuments({
      role: "participant",
      createdAt: { $gte: thirtyDaysAgo },
    });

    const recentParticipants =
      recentParticipantRecords + recentParticipantUsers;

    // Get participant age distributions
    const today = new Date();

    const ageGroups = [
      { name: "0-17", count: 0, min: 0, max: 17 },
      { name: "18-24", count: 0, min: 18, max: 24 },
      { name: "25-49", count: 0, min: 25, max: 49 },
      { name: "50-64", count: 0, min: 50, max: 64 },
      { name: "65+", count: 0, min: 65, max: 200 },
    ];

    // Get all participant DOBs
    const participantDobs = await Participant.find({}, "dateOfBirth");
    const participantUserDobs = await User.find(
      { role: "participant" },
      "dateOfBirth"
    );

    const processAge = (dob) => {
      if (!dob) return;

      const birthDate = new Date(dob);
      let age = today.getFullYear() - birthDate.getFullYear();

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
    };

    // Process all DOBs
    participantDobs.forEach((p) => processAge(p.dateOfBirth));
    participantUserDobs.forEach((p) => processAge(p.dateOfBirth));

    res.json({
      success: true,
      stats: {
        totalParticipants,
        participantRecords: totalParticipantRecords,
        participantUsers: totalParticipantUsers,
        participantsWithAssessments,
        participantsWithoutAssessments:
          totalParticipants - participantsWithAssessments,
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
