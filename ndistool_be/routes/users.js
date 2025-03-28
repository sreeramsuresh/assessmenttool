// routes/users.js
const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const User = require("../models/User");
const Participant = require("../models/Participant");
const Assessment = require("../models/Assessment");
const Assignment = require("../models/Assignment");
const auth = require("../middleware/auth");
const { checkPermission } = require("../middleware/roleAuth");

// @route   GET api/users/profile
// @desc    Get current user profile
// @access  Private
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      user: user.getPublicProfile(),
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   PUT api/users/profile
// @desc    Update user profile
// @access  Private
router.put(
  "/profile",
  [
    auth,
    [
      check("name", "Name is required").not().isEmpty(),
      check("organization", "Organization is required").custom(
        (value, { req }) => {
          // Only required for non-participant roles
          if (req.user.role !== "participant" && !value) {
            throw new Error("Organization is required");
          }
          return true;
        }
      ),
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
      name,
      organization,
      position,
      profileImage,
      contactNumber,
      address,
    } = req.body;

    // Build profile object
    const profileFields = {};
    if (name) profileFields.name = name;
    if (organization) profileFields.organization = organization;
    if (position) profileFields.position = position;
    if (profileImage) profileFields.profileImage = profileImage;

    // Participant-specific fields
    if (contactNumber) profileFields.contactNumber = contactNumber;
    if (address) profileFields.address = address;

    try {
      let user = await User.findById(req.user.id);

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      // Update profile
      user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: profileFields },
        { new: true }
      );

      res.json({
        success: true,
        user: user.getPublicProfile(),
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// @route   PUT api/users/password
// @desc    Change user password
// @access  Private
router.put(
  "/password",
  [
    auth,
    [
      check("currentPassword", "Current password is required").not().isEmpty(),
      check("newPassword", "Password must be at least 6 characters").isLength({
        min: 6,
      }),
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

    const { currentPassword, newPassword } = req.body;

    try {
      const user = await User.findById(req.user.id).select("+password");

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      // Check if current password is correct
      const isMatch = await user.matchPassword(currentPassword);

      if (!isMatch) {
        return res
          .status(400)
          .json({ success: false, message: "Current password is incorrect" });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({ success: true, message: "Password updated successfully" });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// @route   GET api/users/dashboard
// @desc    Get user dashboard stats
// @access  Private
router.get("/dashboard", auth, async (req, res) => {
  try {
    // Get user
    const user = await User.findById(req.user.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    let dashboardData = {
      user: user.getPublicProfile(),
    };

    // Different dashboard data based on role
    if (user.role === "participant") {
      // Get participant's assigned assessments
      const assessments = await Assessment.find({ participant: user._id })
        .sort({ date: -1 })
        .populate("assessor", "name");

      const total = assessments.length;
      const completed = assessments.filter(
        (a) => a.status === "Completed" || a.status === "Reviewed"
      ).length;
      const inProgress = assessments.filter(
        (a) => a.status === "In Progress"
      ).length;
      const pending = assessments.filter((a) => a.status === "Assigned").length;

      dashboardData.stats = {
        total,
        completed,
        inProgress,
        pending,
      };

      dashboardData.assessments = assessments;
    } else if (user.role === "assessor") {
      // Get assessment stats for assessor
      let query = { assessor: user._id };

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
      const pendingReviewAssessments = await Assessment.countDocuments({
        ...query,
        status: "Pending Review",
      });
      const reviewedAssessments = await Assessment.countDocuments({
        ...query,
        status: "Reviewed",
      });

      // Get assigned participants
      const assignments = await Assignment.find({ assessor: user._id })
        .populate("participant", "name ndisNumber")
        .sort("-createdAt");

      // Get recent assessments
      const recentAssessments = await Assessment.find(query)
        .sort({ date: -1 })
        .limit(5)
        .populate("participant", "name ndisNumber")
        .populate("assessor", "name");

      dashboardData.stats = {
        total: totalAssessments,
        draft: draftAssessments,
        assigned: assignedAssessments,
        inProgress: inProgressAssessments,
        completed: completedAssessments,
        pendingReview: pendingReviewAssessments,
        reviewed: reviewedAssessments,
      };

      dashboardData.recentAssessments = recentAssessments;
      dashboardData.assignments = assignments;
    } else if (user.role === "supervisor" || user.role === "admin") {
      // Get all assessments (supervisors see all)
      const totalAssessments = await Assessment.countDocuments();
      const draftAssessments = await Assessment.countDocuments({
        status: "Draft",
      });
      const assignedAssessments = await Assessment.countDocuments({
        status: "Assigned",
      });
      const inProgressAssessments = await Assessment.countDocuments({
        status: "In Progress",
      });
      const completedAssessments = await Assessment.countDocuments({
        status: "Completed",
      });
      const pendingReviewAssessments = await Assessment.countDocuments({
        status: "Pending Review",
      });
      const reviewedAssessments = await Assessment.countDocuments({
        status: "Reviewed",
      });

      // Get user counts
      const totalAssessors = await User.countDocuments({ role: "assessor" });
      const totalParticipants = await User.countDocuments({
        role: "participant",
      });
      const activeAssignments = await Assignment.countDocuments({
        status: { $ne: "completed" },
      });

      // Get recent assignments
      const recentAssignments = await Assignment.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("supervisor", "name")
        .populate("assessor", "name")
        .populate("participant", "name ndisNumber");

      // Get recent assessments
      const recentAssessments = await Assessment.find()
        .sort({ date: -1 })
        .limit(5)
        .populate("participant", "name ndisNumber")
        .populate("assessor", "name");

      dashboardData.stats = {
        assessments: {
          total: totalAssessments,
          draft: draftAssessments,
          assigned: assignedAssessments,
          inProgress: inProgressAssessments,
          completed: completedAssessments,
          pendingReview: pendingReviewAssessments,
          reviewed: reviewedAssessments,
        },
        users: {
          assessors: totalAssessors,
          participants: totalParticipants,
          activeAssignments,
        },
      };

      dashboardData.recentAssessments = recentAssessments;
      dashboardData.recentAssignments = recentAssignments;
    }

    res.json({
      success: true,
      dashboardData,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin routes

// @route   GET api/users
// @desc    Get all users
// @access  Private/Admin
router.get("/", [auth, checkPermission("VIEW_USERS")], async (req, res) => {
  try {
    // Allow filtering by role
    const roleFilter = req.query.role ? { role: req.query.role } : {};

    const users = await User.find(roleFilter)
      .select("-notifications")
      .sort("name");

    res.json({
      success: true,
      users: users.map((user) => user.getPublicProfile()),
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   GET api/users/:id
// @desc    Get user by ID
// @access  Private/Admin
router.get("/:id", [auth, checkPermission("VIEW_USERS")], async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-notifications");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      user: user.getPublicProfile(),
    });
  } catch (err) {
    console.error(err.message);

    // Check for invalid ObjectId
    if (err.kind === "ObjectId") {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   POST api/users
// @desc    Create a new user (admin only)
// @access  Private/Admin
router.post(
  "/",
  [
    auth,
    checkPermission("CREATE_USER"),
    [
      check("name", "Name is required").not().isEmpty(),
      check("email", "Please include a valid email").isEmail(),
      check("password", "Password must be at least 6 characters").isLength({
        min: 6,
      }),
      check("role", "Role is required").isIn([
        "assessor",
        "supervisor",
        "admin",
        "participant",
      ]),
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
      name,
      email,
      password,
      organization,
      position,
      role,
      isActive,
      ndisNumber,
      dateOfBirth,
      contactNumber,
      address,
      linkedParticipantId,
    } = req.body;

    try {
      // Check if user exists
      let user = await User.findOne({ email });

      if (user) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // For participants, check if NDIS number is unique if provided
      if (role === "participant" && ndisNumber) {
        const existingParticipant = await User.findOne({ ndisNumber });
        if (existingParticipant) {
          return res.status(400).json({
            success: false,
            message: "Participant with this NDIS number already exists",
          });
        }
      }

      // Create new user with appropriate fields
      const userData = {
        name,
        email,
        password,
        role,
        isActive: isActive === false ? false : true,
        isEmailConfirmed: true, // Admin-created accounts don't need email confirmation
      };

      // Add role-specific fields
      if (role !== "participant") {
        userData.organization = organization;
        userData.position = position || "";
      } else {
        userData.ndisNumber = ndisNumber;
        userData.dateOfBirth = dateOfBirth;
        userData.contactNumber = contactNumber;
        userData.address = address;
        userData.linkedParticipantId = linkedParticipantId;
      }

      user = new User(userData);
      await user.save();

      res.json({
        success: true,
        message: "User created successfully",
        user: user.getPublicProfile(),
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// @route   POST api/users/participant-from-participant
// @desc    Create a participant user from existing participant record
// @access  Private/Admin or Supervisor
router.post(
  "/participant-from-participant",
  [
    auth,
    checkPermission("CREATE_USER"),
    [
      check("participantId", "Participant ID is required").not().isEmpty(),
      check("password", "Password must be at least 6 characters").isLength({
        min: 6,
      }),
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

    const { participantId, password } = req.body;

    try {
      // Find the participant record
      const participant = await Participant.findById(participantId);

      if (!participant) {
        return res.status(404).json({
          success: false,
          message: "Participant not found",
        });
      }

      // Check if a user with this email already exists
      if (participant.email) {
        const existingUser = await User.findOne({ email: participant.email });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: "User with this email already exists",
          });
        }
      }

      // Create a user account for this participant
      const user = new User({
        name: participant.fullName,
        email:
          participant.email || `ndis-${participant.ndisNumber}@example.com`, // Fallback email if none provided
        password,
        role: "participant",
        ndisNumber: participant.ndisNumber,
        dateOfBirth: participant.dateOfBirth,
        contactNumber: participant.contactNumber,
        address: participant.address,
        isActive: true,
        isEmailConfirmed: true, // Admin-created accounts don't need email confirmation
        linkedParticipantId: participant._id,
      });

      await user.save();

      res.json({
        success: true,
        message: "Participant user created successfully",
        user: user.getPublicProfile(),
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// @route   PUT api/users/:id
// @desc    Update user (admin only)
// @access  Private/Admin
router.put(
  "/:id",
  [
    auth,
    checkPermission("UPDATE_USER"),
    [
      check("name", "Name is required").not().isEmpty(),
      check("email", "Please include a valid email").isEmail(),
      check("role", "Role is required").isIn([
        "assessor",
        "supervisor",
        "admin",
        "participant",
      ]),
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
      name,
      email,
      organization,
      position,
      role,
      isActive,
      ndisNumber,
      dateOfBirth,
      contactNumber,
      address,
    } = req.body;

    try {
      let user = await User.findById(req.params.id);

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      // Check if email is changing and if it's already in use
      if (email !== user.email) {
        const existingUser = await User.findOne({ email });

        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: "Email is already in use",
          });
        }
      }

      // Check if NDIS number is changing (for participants) and if it's already in use
      if (
        role === "participant" &&
        ndisNumber &&
        ndisNumber !== user.ndisNumber
      ) {
        const existingParticipant = await User.findOne({ ndisNumber });

        if (
          existingParticipant &&
          existingParticipant._id.toString() !== req.params.id
        ) {
          return res.status(400).json({
            success: false,
            message: "NDIS number is already in use",
          });
        }
      }

      // Update user
      user.name = name;
      user.email = email;
      user.role = role;
      user.isActive = isActive === false ? false : true;

      // Update role-specific fields
      if (role !== "participant") {
        user.organization = organization;
        user.position = position || "";
      } else {
        user.ndisNumber = ndisNumber;
        user.dateOfBirth = dateOfBirth;
        user.contactNumber = contactNumber;
        user.address = address;
      }

      await user.save();

      res.json({
        success: true,
        message: "User updated successfully",
        user: user.getPublicProfile(),
      });
    } catch (err) {
      console.error(err.message);

      // Check for invalid ObjectId
      if (err.kind === "ObjectId") {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// @route   DELETE api/users/:id
// @desc    Delete user (admin only)
// @access  Private/Admin
router.delete(
  "/:id",
  [auth, checkPermission("DELETE_USER")],
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      // Don't allow deleting oneself
      if (user._id.toString() === req.user.id) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete your own account",
        });
      }

      // Check if user has assessments
      const assessmentCount = await Assessment.countDocuments({
        $or: [
          { assessor: user._id },
          { participant: user._id },
          { reviewedBy: user._id },
        ],
      });

      // Check for assignments
      const assignmentCount = await Assignment.countDocuments({
        $or: [
          { supervisor: user._id },
          { assessor: user._id },
          { participant: user._id },
        ],
      });

      if (assessmentCount > 0 || assignmentCount > 0) {
        // Instead of deleting, deactivate the user
        user.isActive = false;
        await user.save();

        return res.json({
          success: true,
          message: `User deactivated instead of deleted because they have ${assessmentCount} assessments and/or ${assignmentCount} assignments`,
        });
      }

      // Otherwise, delete the user
      await user.deleteOne();

      res.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (err) {
      console.error(err.message);

      // Check for invalid ObjectId
      if (err.kind === "ObjectId") {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// @route   GET api/users/role/:role
// @desc    Get users by role
// @access  Private
router.get("/role/:role", auth, async (req, res) => {
  try {
    const role = req.params.role;

    // Validate role
    if (!["assessor", "supervisor", "admin", "participant"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified",
      });
    }

    // Check permissions
    if (
      (role === "supervisor" || role === "admin") &&
      !["admin", "supervisor"].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view users of this role",
      });
    }

    let users;

    if (role === "assessor") {
      users = await User.getAssessors();
    } else if (role === "supervisor") {
      users = await User.getSupervisors();
    } else if (role === "participant") {
      users = await User.getParticipants();
    } else {
      // Admin role - only admins can see other admins
      if (req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Not authorized to view admin users",
        });
      }
      users = await User.find({ role: "admin", isActive: true })
        .select("name email organization position")
        .sort("name");
    }

    res.json({
      success: true,
      users,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
