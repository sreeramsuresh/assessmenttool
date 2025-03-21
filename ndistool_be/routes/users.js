// routes/users.js
const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const User = require("../models/User");
const Assessment = require("../models/Assessment");
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
      check("organization", "Organization is required").not().isEmpty(),
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

    const { name, organization, position, profileImage } = req.body;

    // Build profile object
    const profileFields = {};
    if (name) profileFields.name = name;
    if (organization) profileFields.organization = organization;
    if (position) profileFields.position = position;
    if (profileImage) profileFields.profileImage = profileImage;

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

    // Get assessment stats
    let query = {};

    // If assessor, only show their assessments
    if (req.user.role === "assessor") {
      query.assessor = req.user.id;
    }

    const totalAssessments = await Assessment.countDocuments(query);
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

    // Get recent assessments
    const recentAssessments = await Assessment.find(query)
      .sort({ date: -1 })
      .limit(5)
      .populate("assessor", "name");

    // Get monthly stats (last 6 months)
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

    res.json({
      success: true,
      dashboardData: {
        user: user.getPublicProfile(),
        stats: {
          total: totalAssessments,
          completed: completedAssessments,
          pendingReview: pendingReviewAssessments,
          reviewed: reviewedAssessments,
        },
        recentAssessments,
        monthlyData,
      },
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
    const users = await User.find().select("-notifications").sort("name");

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
      check("organization", "Organization is required").not().isEmpty(),
      check("role", "Role is required").isIn([
        "assessor",
        "supervisor",
        "admin",
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

    const { name, email, password, organization, position, role, isActive } =
      req.body;

    try {
      // Check if user exists
      let user = await User.findOne({ email });

      if (user) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Create new user
      user = new User({
        name,
        email,
        password,
        organization,
        position: position || "",
        role,
        isActive: isActive === false ? false : true,
        isEmailConfirmed: true, // Admin-created accounts don't need email confirmation
      });

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
      check("organization", "Organization is required").not().isEmpty(),
      check("role", "Role is required").isIn([
        "assessor",
        "supervisor",
        "admin",
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

    const { name, email, organization, position, role, isActive } = req.body;

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

      // Update user
      user.name = name;
      user.email = email;
      user.organization = organization;
      user.position = position || "";
      user.role = role;
      user.isActive = isActive === false ? false : true;

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
        assessor: user._id,
      });

      if (assessmentCount > 0) {
        // Instead of deleting, deactivate the user
        user.isActive = false;
        await user.save();

        return res.json({
          success: true,
          message: `User deactivated instead of deleted because they have ${assessmentCount} assessments`,
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

// @route   GET api/users/assessors
// @desc    Get all assessors (for assignments)
// @access  Private
router.get("/role/assessors", auth, async (req, res) => {
  try {
    const assessors = await User.getAssessors();

    res.json({
      success: true,
      assessors,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   GET api/users/supervisors
// @desc    Get all supervisors (for assignments)
// @access  Private
router.get("/role/supervisors", auth, async (req, res) => {
  try {
    const supervisors = await User.getSupervisors();

    res.json({
      success: true,
      supervisors,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
