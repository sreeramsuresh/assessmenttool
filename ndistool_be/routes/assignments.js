// routes/assignments.js
const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const Assignment = require("../models/Assignment");
const Assessment = require("../models/Assessment");
const User = require("../models/User");
const auth = require("../middleware/auth");
const { checkPermission } = require("../middleware/roleAuth");

// @route   POST api/assignments
// @desc    Create new assignment
// @access  Private/Supervisor, Admin
router.post(
  "/",
  [
    auth,
    checkPermission("CREATE_ASSIGNMENT"),
    [
      check("assessor", "Assessor is required").notEmpty(),
      check("participant", "Participant is required").notEmpty(),
      check("title", "Title is required").notEmpty(),
      check("requiredSections", "At least one section is required").isArray({
        min: 1,
      }),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const {
        assessor,
        participant,
        title,
        description,
        dueDate,
        requiredSections,
        notes,
      } = req.body;

      // Verify assessor exists and is an assessor
      const assessorUser = await User.findById(assessor);
      if (!assessorUser || assessorUser.role !== "assessor") {
        return res.status(400).json({
          success: false,
          message: "Invalid assessor - must be a user with assessor role",
        });
      }

      // Verify participant exists and is a participant
      const participantUser = await User.findById(participant);
      if (!participantUser || participantUser.role !== "participant") {
        return res.status(400).json({
          success: false,
          message: "Invalid participant - must be a user with participant role",
        });
      }

      // Create new assignment
      const newAssignment = new Assignment({
        supervisor: req.user.id,
        assessor,
        participant,
        title,
        description,
        requiredSections: requiredSections || [0, 1, 2, 3, 4, 5],
        notes,
        status: "pending",
      });

      // Add due date if provided
      if (dueDate) {
        newAssignment.dueDate = dueDate;
      }

      await newAssignment.save();

      // Send notifications to assessor and participant
      await assessorUser.addNotification(
        `New assignment: ${title}`,
        "assignment",
        `/assignments/${newAssignment._id}`
      );

      await participantUser.addNotification(
        `You have been assigned to a new assessment: ${title}`,
        "assignment",
        `/assignments/${newAssignment._id}`
      );

      res.status(201).json({
        success: true,
        message: "Assignment created successfully",
        assignment: newAssignment,
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

// @route   GET api/assignments
// @desc    Get all assignments (filtered by role)
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    let query = {};

    // Filter based on user role
    if (req.user.role === "assessor") {
      query.assessor = req.user.id;
    } else if (req.user.role === "supervisor") {
      query.supervisor = req.user.id;
    } else if (req.user.role === "participant") {
      query.participant = req.user.id;
    }

    // Add filters from query parameters
    if (req.query.status) {
      query.status = req.query.status;
    }

    if (
      req.query.assessorId &&
      (req.user.role === "admin" || req.user.role === "supervisor")
    ) {
      query.assessor = req.query.assessorId;
    }

    if (
      req.query.participantId &&
      (req.user.role === "admin" || req.user.role === "supervisor")
    ) {
      query.participant = req.query.participantId;
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const assignments = await Assignment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("supervisor", "name")
      .populate("assessor", "name")
      .populate("participant", "name ndisNumber")
      .populate({
        path: "assessments",
        select: "status date completionDate dueDate",
      });

    const total = await Assignment.countDocuments(query);

    res.json({
      success: true,
      assignments,
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

// @route   GET api/assignments/:id
// @desc    Get assignment by ID
// @access  Private
router.get("/:id", auth, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate("supervisor", "name email organization position")
      .populate("assessor", "name email organization position")
      .populate(
        "participant",
        "name email ndisNumber dateOfBirth contactNumber address"
      )
      .populate({
        path: "assessments",
        populate: {
          path: "assessor",
          select: "name",
        },
      })
      .populate({
        path: "history.user",
        select: "name role",
      });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    // Check if user is authorized to view this assignment
    const isAuthorized =
      req.user.role === "admin" ||
      assignment.supervisor._id.toString() === req.user.id ||
      assignment.assessor._id.toString() === req.user.id ||
      assignment.participant._id.toString() === req.user.id;

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this assignment",
      });
    }

    res.json({
      success: true,
      assignment,
    });
  } catch (err) {
    console.error(err.message);

    // Check for invalid ObjectId
    if (err.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   PUT api/assignments/:id
// @desc    Update assignment
// @access  Private/Supervisor, Admin
router.put(
  "/:id",
  [
    auth,
    checkPermission("UPDATE_ASSIGNMENT"),
    [
      check("title", "Title is required").optional().notEmpty(),
      check("requiredSections", "At least one section is required")
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
      const assignment = await Assignment.findById(req.params.id);

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Assignment not found",
        });
      }

      // Check if user is authorized to update this assignment
      if (
        req.user.role !== "admin" &&
        assignment.supervisor.toString() !== req.user.id
      ) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update this assignment",
        });
      }

      // Don't allow updating completed assignments
      if (
        assignment.status === "completed" ||
        assignment.status === "cancelled"
      ) {
        return res.status(400).json({
          success: false,
          message: `Cannot update assignment that is in ${assignment.status} status`,
        });
      }

      const { title, description, assessor, dueDate, requiredSections, notes } =
        req.body;

      // Update fields
      if (title) assignment.title = title;
      if (description !== undefined) assignment.description = description;
      if (dueDate) assignment.dueDate = dueDate;
      if (requiredSections) assignment.requiredSections = requiredSections;
      if (notes !== undefined) assignment.notes = notes;

      // Update assessor (only if no assessments have been created yet)
      if (assessor && assignment.assessments.length === 0) {
        const assessorUser = await User.findById(assessor);
        if (!assessorUser || assessorUser.role !== "assessor") {
          return res.status(400).json({
            success: false,
            message: "Invalid assessor - must be a user with assessor role",
          });
        }

        // Notify old assessor if being replaced
        if (assignment.assessor.toString() !== assessor) {
          const oldAssessor = await User.findById(assignment.assessor);
          if (oldAssessor) {
            await oldAssessor.addNotification(
              `You have been removed from assignment: ${assignment.title}`,
              "info"
            );
          }

          // Notify new assessor
          await assessorUser.addNotification(
            `You have been assigned to: ${assignment.title}`,
            "assignment",
            `/assignments/${assignment._id}`
          );

          assignment.assessor = assessor;
        }
      }

      // Add history entry
      assignment.history.push({
        action: "updated",
        user: req.user.id,
        details: "Assignment details updated",
        timestamp: new Date(),
      });

      // Update last activity
      assignment.lastActivity = new Date();
      assignment.lastActivityBy = req.user.id;
      assignment.lastActivityType = "updated";

      await assignment.save();

      res.json({
        success: true,
        message: "Assignment updated successfully",
        assignment,
      });
    } catch (err) {
      console.error(err.message);

      // Check for invalid ObjectId
      if (err.kind === "ObjectId") {
        return res.status(404).json({
          success: false,
          message: "Assignment not found",
        });
      }

      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// @route   PUT api/assignments/:id/status
// @desc    Update assignment status
// @access  Private
router.put(
  "/:id/status",
  [
    auth,
    [
      check("status", "Status is required").isIn([
        "pending",
        "accepted",
        "in_progress",
        "completed",
        "cancelled",
      ]),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const assignment = await Assignment.findById(req.params.id);

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Assignment not found",
        });
      }

      // Check permissions based on role and requested status change
      const { status } = req.body;

      // Supervisors and admins can change to any status
      const isSupervisorOrAdmin =
        req.user.role === "admin" ||
        (req.user.role === "supervisor" &&
          assignment.supervisor.toString() === req.user.id);

      // Assessors can only accept, start, or complete assignments assigned to them
      const isAssessor =
        req.user.role === "assessor" &&
        assignment.assessor.toString() === req.user.id;

      // Participants generally don't change assignment status directly

      if (!isSupervisorOrAdmin && !isAssessor) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update this assignment's status",
        });
      }

      // Additional status transition validations
      if (
        assignment.status === "completed" ||
        assignment.status === "cancelled"
      ) {
        return res.status(400).json({
          success: false,
          message: `Cannot change status of an assignment that is already ${assignment.status}`,
        });
      }

      if (isAssessor) {
        // Assessors can only make certain status transitions
        if (
          (assignment.status === "pending" && status !== "accepted") ||
          (assignment.status === "accepted" && status !== "in_progress") ||
          (assignment.status === "in_progress" && status !== "completed")
        ) {
          return res.status(400).json({
            success: false,
            message: `Invalid status transition from ${assignment.status} to ${status} for assessor`,
          });
        }
      }

      // Update the status
      await assignment.updateStatus(status, req.user.id);

      // Send notifications
      const notifyUsers = [];

      if (req.user.id !== assignment.supervisor.toString()) {
        notifyUsers.push(assignment.supervisor);
      }

      if (req.user.id !== assignment.assessor.toString()) {
        notifyUsers.push(assignment.assessor);
      }

      if (status === "completed" || status === "cancelled") {
        notifyUsers.push(assignment.participant);
      }

      // Send notifications to relevant users
      for (const userId of notifyUsers) {
        const user = await User.findById(userId);
        if (user) {
          await user.addNotification(
            `Assignment "${assignment.title}" status changed to ${status}`,
            "info",
            `/assignments/${assignment._id}`
          );
        }
      }

      res.json({
        success: true,
        message: "Assignment status updated successfully",
        assignment,
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

// @route   POST api/assignments/:id/notes
// @desc    Add note to assignment
// @access  Private
router.post(
  "/:id/notes",
  [auth, [check("note", "Note content is required").notEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const assignment = await Assignment.findById(req.params.id);

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Assignment not found",
        });
      }

      // Check if user is authorized to add notes to this assignment
      const isAuthorized =
        req.user.role === "admin" ||
        assignment.supervisor.toString() === req.user.id ||
        assignment.assessor.toString() === req.user.id;

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to add notes to this assignment",
        });
      }

      const { note } = req.body;

      // Append to existing notes or create new
      if (assignment.notes) {
        assignment.notes += `\n\n${new Date().toISOString()} - ${
          req.user.name
        }:\n${note}`;
      } else {
        assignment.notes = `${new Date().toISOString()} - ${
          req.user.name
        }:\n${note}`;
      }

      // Add history entry
      assignment.history.push({
        action: "note_added",
        user: req.user.id,
        details: "Note added to assignment",
        timestamp: new Date(),
      });

      // Update last activity
      assignment.lastActivity = new Date();
      assignment.lastActivityBy = req.user.id;
      assignment.lastActivityType = "note_added";

      await assignment.save();

      // Notify other parties involved
      const notifyUsers = [];

      if (req.user.id !== assignment.supervisor.toString()) {
        notifyUsers.push(assignment.supervisor);
      }

      if (req.user.id !== assignment.assessor.toString()) {
        notifyUsers.push(assignment.assessor);
      }

      // Send notifications to relevant users
      for (const userId of notifyUsers) {
        const user = await User.findById(userId);
        if (user) {
          await user.addNotification(
            `New note added to assignment "${assignment.title}"`,
            "info",
            `/assignments/${assignment._id}`
          );
        }
      }

      res.json({
        success: true,
        message: "Note added successfully",
        assignment,
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

// @route   DELETE api/assignments/:id
// @desc    Delete assignment
// @access  Private/Admin, Supervisor
router.delete(
  "/:id",
  [auth, checkPermission("DELETE_ASSIGNMENT")],
  async (req, res) => {
    try {
      const assignment = await Assignment.findById(req.params.id);

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Assignment not found",
        });
      }

      // Check if user is authorized to delete this assignment
      if (
        req.user.role !== "admin" &&
        assignment.supervisor.toString() !== req.user.id
      ) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to delete this assignment",
        });
      }

      // Check for linked assessments
      if (assignment.assessments && assignment.assessments.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete assignment that has ${assignment.assessments.length} assessments. Consider marking it as cancelled instead.`,
        });
      }

      // Delete the assignment
      await assignment.deleteOne();

      // Notify assessor and participant
      const assessor = await User.findById(assignment.assessor);
      if (assessor) {
        await assessor.addNotification(
          `Assignment "${assignment.title}" has been deleted`,
          "info"
        );
      }

      const participant = await User.findById(assignment.participant);
      if (participant) {
        await participant.addNotification(
          `Assignment "${assignment.title}" has been deleted`,
          "info"
        );
      }

      res.json({
        success: true,
        message: "Assignment deleted successfully",
      });
    } catch (err) {
      console.error(err.message);

      // Check for invalid ObjectId
      if (err.kind === "ObjectId") {
        return res.status(404).json({
          success: false,
          message: "Assignment not found",
        });
      }

      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// @route   GET api/assignments/dashboard/stats
// @desc    Get assignment stats for dashboard
// @access  Private
router.get("/dashboard/stats", auth, async (req, res) => {
  try {
    let query = {};

    // Filter based on user role
    if (req.user.role === "assessor") {
      query.assessor = req.user.id;
    } else if (req.user.role === "supervisor") {
      query.supervisor = req.user.id;
    } else if (req.user.role === "participant") {
      query.participant = req.user.id;
    }

    // Count assignments by status
    const totalAssignments = await Assignment.countDocuments(query);
    const pendingAssignments = await Assignment.countDocuments({
      ...query,
      status: "pending",
    });
    const acceptedAssignments = await Assignment.countDocuments({
      ...query,
      status: "accepted",
    });
    const inProgressAssignments = await Assignment.countDocuments({
      ...query,
      status: "in_progress",
    });
    const completedAssignments = await Assignment.countDocuments({
      ...query,
      status: "completed",
    });
    const cancelledAssignments = await Assignment.countDocuments({
      ...query,
      status: "cancelled",
    });

    // Get recent assignments
    const recentAssignments = await Assignment.find(query)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("supervisor", "name")
      .populate("assessor", "name")
      .populate("participant", "name ndisNumber");

    // Due soon assignments
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const dueSoonAssignments = await Assignment.find({
      ...query,
      dueDate: { $lte: nextWeek, $gte: new Date() },
      status: { $nin: ["completed", "cancelled"] },
    })
      .sort({ dueDate: 1 })
      .limit(5)
      .populate("supervisor", "name")
      .populate("assessor", "name")
      .populate("participant", "name ndisNumber");

    // Additional stats for supervisors and admins
    let assessorStats = [];

    if (req.user.role === "supervisor" || req.user.role === "admin") {
      // Get assessor performance stats if supervisor
      const baseQuery =
        req.user.role === "supervisor" ? { supervisor: req.user.id } : {};

      const assessorIds = await Assignment.distinct("assessor", baseQuery);

      const assessorPromises = assessorIds.map(async (assessorId) => {
        const assessor = await User.findById(assessorId).select("name");

        if (!assessor) return null;

        const totalCount = await Assignment.countDocuments({
          ...baseQuery,
          assessor: assessorId,
        });
        const completedCount = await Assignment.countDocuments({
          ...baseQuery,
          assessor: assessorId,
          status: "completed",
        });
        const inProgressCount = await Assignment.countDocuments({
          ...baseQuery,
          assessor: assessorId,
          status: { $in: ["accepted", "in_progress"] },
        });

        return {
          assessor: {
            id: assessorId,
            name: assessor.name,
          },
          totalAssignments: totalCount,
          completedAssignments: completedCount,
          inProgressAssignments: inProgressCount,
          completionRate:
            totalCount > 0
              ? Math.round((completedCount / totalCount) * 100)
              : 0,
        };
      });

      assessorStats = (await Promise.all(assessorPromises)).filter(Boolean);
    }

    res.json({
      success: true,
      stats: {
        counts: {
          total: totalAssignments,
          pending: pendingAssignments,
          accepted: acceptedAssignments,
          inProgress: inProgressAssignments,
          completed: completedAssignments,
          cancelled: cancelledAssignments,
        },
        recentAssignments,
        dueSoonAssignments,
        assessorStats,
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
