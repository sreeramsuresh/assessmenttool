// controllers/dashboardController.js
const User = require("../models/User");
const Assessment = require("../models/Assessment");
const Assignment = require("../models/Assignment");
const Participant = require("../models/Participant");

/**
 * Get dashboard data for the logged-in user based on their role
 * @param {*} req - Express request object
 * @param {*} res - Express response object
 */
exports.getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let dashboardData = {
      user: {},
    };

    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    dashboardData.user = user.getPublicProfile();

    // Get role-specific data
    switch (userRole) {
      case "participant":
        dashboardData = {
          ...dashboardData,
          ...(await getParticipantDashboard(userId)),
        };
        break;
      case "assessor":
        dashboardData = {
          ...dashboardData,
          ...(await getAssessorDashboard(userId)),
        };
        break;
      case "supervisor":
        dashboardData = {
          ...dashboardData,
          ...(await getSupervisorDashboard(userId)),
        };
        break;
      case "admin":
        dashboardData = {
          ...dashboardData,
          ...(await getAdminDashboard()),
        };
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid user role",
        });
    }

    res.json({
      success: true,
      dashboardData,
    });
  } catch (err) {
    console.error("Dashboard data error:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * Get dashboard data for participant
 * @param {string} userId - User ID
 * @returns {Object} Dashboard data
 */
const getParticipantDashboard = async (userId) => {
  // Get assignments
  const assignments = await Assignment.find({ participant: userId })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("assessor", "name")
    .populate("supervisor", "name");

  // Get assessments
  const assessments = await Assessment.find({ participant: userId })
    .sort({ date: -1 })
    .limit(5)
    .populate("assessor", "name");

  // Calculate stats
  const totalAssessments = await Assessment.countDocuments({
    participant: userId,
  });
  const completedAssessments = await Assessment.countDocuments({
    participant: userId,
    status: { $in: ["Completed", "Reviewed"] },
  });
  const inProgressAssessments = await Assessment.countDocuments({
    participant: userId,
    status: "In Progress",
  });
  const assignedAssessments = await Assessment.countDocuments({
    participant: userId,
    status: "Assigned",
  });

  const totalAssignments = await Assignment.countDocuments({
    participant: userId,
  });
  const activeAssignments = await Assignment.countDocuments({
    participant: userId,
    status: { $in: ["pending", "accepted", "in_progress"] },
  });

  // Get upcoming assessments (due in the next 7 days)
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  const upcomingAssessments = await Assessment.find({
    participant: userId,
    status: { $in: ["Assigned", "In Progress"] },
    dueDate: { $lte: nextWeek, $gte: new Date() },
  })
    .sort({ dueDate: 1 })
    .limit(3)
    .populate("assessor", "name");

  return {
    assessments: {
      recent: assessments,
      upcoming: upcomingAssessments,
      stats: {
        total: totalAssessments,
        completed: completedAssessments,
        inProgress: inProgressAssessments,
        assigned: assignedAssessments,
      },
    },
    assignments: {
      recent: assignments,
      stats: {
        total: totalAssignments,
        active: activeAssignments,
      },
    },
  };
};

/**
 * Get dashboard data for assessor
 * @param {string} userId - User ID
 * @returns {Object} Dashboard data
 */
const getAssessorDashboard = async (userId) => {
  // Get assignments
  const assignments = await Assignment.find({ assessor: userId })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("participant", "name ndisNumber")
    .populate("supervisor", "name");

  // Get assessments
  const assessments = await Assessment.find({ assessor: userId })
    .sort({ date: -1 })
    .limit(5)
    .populate("participant", "name ndisNumber");

  // Calculate stats
  const totalAssessments = await Assessment.countDocuments({
    assessor: userId,
  });
  const draftAssessments = await Assessment.countDocuments({
    assessor: userId,
    status: "Draft",
  });
  const assignedAssessments = await Assessment.countDocuments({
    assessor: userId,
    status: "Assigned",
  });
  const inProgressAssessments = await Assessment.countDocuments({
    assessor: userId,
    status: "In Progress",
  });
  const completedAssessments = await Assessment.countDocuments({
    assessor: userId,
    status: "Completed",
  });
  const reviewedAssessments = await Assessment.countDocuments({
    assessor: userId,
    status: "Reviewed",
  });

  // Get assigned participants count
  const assignedParticipants = await Assignment.distinct("participant", {
    assessor: userId,
  });

  // Get recently assigned participants
  const recentAssignments = await Assignment.find({ assessor: userId })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("participant", "name ndisNumber")
    .populate("supervisor", "name");

  // Get assessments due soon
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  const dueSoonAssessments = await Assessment.find({
    assessor: userId,
    status: { $in: ["Draft", "Assigned", "In Progress"] },
    dueDate: { $lte: nextWeek, $gte: new Date() },
  })
    .sort({ dueDate: 1 })
    .limit(3)
    .populate("participant", "name ndisNumber");

  // Get assessments pending review
  const pendingReviewAssessments = await Assessment.find({
    assessor: userId,
    status: "Completed",
  })
    .sort({ completionDate: -1 })
    .limit(5)
    .populate("participant", "name ndisNumber");

  return {
    assessments: {
      recent: assessments,
      dueSoon: dueSoonAssessments,
      pendingReview: pendingReviewAssessments,
      stats: {
        total: totalAssessments,
        draft: draftAssessments,
        assigned: assignedAssessments,
        inProgress: inProgressAssessments,
        completed: completedAssessments,
        reviewed: reviewedAssessments,
      },
    },
    assignments: {
      recent: recentAssignments,
      stats: {
        assignedParticipants: assignedParticipants.length,
        totalAssignments: await Assignment.countDocuments({ assessor: userId }),
        activeAssignments: await Assignment.countDocuments({
          assessor: userId,
          status: { $in: ["pending", "accepted", "in_progress"] },
        }),
      },
    },
  };
};

/**
 * Get dashboard data for supervisor
 * @param {string} userId - User ID
 * @returns {Object} Dashboard data
 */
const getSupervisorDashboard = async (userId) => {
  // Get assignments created by this supervisor
  const assignments = await Assignment.find({ supervisor: userId })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("assessor", "name")
    .populate("participant", "name ndisNumber");

  // Calculate stats
  const totalAssignments = await Assignment.countDocuments({
    supervisor: userId,
  });
  const pendingAssignments = await Assignment.countDocuments({
    supervisor: userId,
    status: "pending",
  });
  const activeAssignments = await Assignment.countDocuments({
    supervisor: userId,
    status: { $in: ["accepted", "in_progress"] },
  });
  const completedAssignments = await Assignment.countDocuments({
    supervisor: userId,
    status: "completed",
  });

  // Get assessors and participants managed by this supervisor
  const assignedAssessors = await Assignment.distinct("assessor", {
    supervisor: userId,
  });
  const assignedParticipants = await Assignment.distinct("participant", {
    supervisor: userId,
  });

  // Get assessments associated with assignments created by this supervisor
  const assignmentIds = await Assignment.find({ supervisor: userId }).distinct(
    "_id"
  );
  const assessments = await Assessment.find({
    assignmentId: { $in: assignmentIds },
  })
    .sort({ date: -1 })
    .limit(5)
    .populate("assessor", "name")
    .populate("participant", "name ndisNumber");

  // Get assessment stats
  const totalAssessments = await Assessment.countDocuments({
    assignmentId: { $in: assignmentIds },
  });
  const draftAssessments = await Assessment.countDocuments({
    assignmentId: { $in: assignmentIds },
    status: "Draft",
  });
  const assignedAssessments = await Assessment.countDocuments({
    assignmentId: { $in: assignmentIds },
    status: "Assigned",
  });
  const inProgressAssessments = await Assessment.countDocuments({
    assignmentId: { $in: assignmentIds },
    status: "In Progress",
  });
  const completedAssessments = await Assessment.countDocuments({
    assignmentId: { $in: assignmentIds },
    status: "Completed",
  });
  const reviewedAssessments = await Assessment.countDocuments({
    assignmentId: { $in: assignmentIds },
    status: "Reviewed",
  });

  // Get assessor performance stats
  const assessorStats = await Promise.all(
    assignedAssessors.map(async (assessorId) => {
      const assessor = await User.findById(assessorId).select("name");

      if (!assessor) return null;

      const totalCount = await Assignment.countDocuments({
        supervisor: userId,
        assessor: assessorId,
      });

      const completedCount = await Assignment.countDocuments({
        supervisor: userId,
        assessor: assessorId,
        status: "completed",
      });

      const inProgressCount = await Assignment.countDocuments({
        supervisor: userId,
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
          totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      };
    })
  );

  return {
    assignments: {
      recent: assignments,
      stats: {
        total: totalAssignments,
        pending: pendingAssignments,
        active: activeAssignments,
        completed: completedAssignments,
        assessors: assignedAssessors.length,
        participants: assignedParticipants.length,
      },
    },
    assessments: {
      recent: assessments,
      stats: {
        total: totalAssessments,
        draft: draftAssessments,
        assigned: assignedAssessments,
        inProgress: inProgressAssessments,
        completed: completedAssessments,
        reviewed: reviewedAssessments,
      },
    },
    assessorStats: assessorStats.filter(Boolean),
  };
};

/**
 * Get dashboard data for admin
 * @returns {Object} Dashboard data
 */
const getAdminDashboard = async () => {
  // Get user counts
  const totalUsers = await User.countDocuments();
  const adminUsers = await User.countDocuments({ role: "admin" });
  const supervisorUsers = await User.countDocuments({ role: "supervisor" });
  const assessorUsers = await User.countDocuments({ role: "assessor" });
  const participantUsers = await User.countDocuments({ role: "participant" });

  // Get participant counts (both user participants and participant records)
  const totalParticipantRecords = await Participant.countDocuments();
  const totalParticipants = participantUsers + totalParticipantRecords;

  // Get assignment stats
  const totalAssignments = await Assignment.countDocuments();
  const pendingAssignments = await Assignment.countDocuments({
    status: "pending",
  });
  const activeAssignments = await Assignment.countDocuments({
    status: { $in: ["accepted", "in_progress"] },
  });
  const completedAssignments = await Assignment.countDocuments({
    status: "completed",
  });

  // Get assessment stats
  const totalAssessments = await Assessment.countDocuments();
  const draftAssessments = await Assessment.countDocuments({ status: "Draft" });
  const assignedAssessments = await Assessment.countDocuments({
    status: "Assigned",
  });
  const inProgressAssessments = await Assessment.countDocuments({
    status: "In Progress",
  });
  const completedAssessments = await Assessment.countDocuments({
    status: "Completed",
  });
  const reviewedAssessments = await Assessment.countDocuments({
    status: "Reviewed",
  });

  // Get recent data
  const recentUsers = await User.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select("name email role createdAt");

  const recentAssignments = await Assignment.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("supervisor", "name")
    .populate("assessor", "name")
    .populate("participant", "name ndisNumber");

  const recentAssessments = await Assessment.find()
    .sort({ date: -1 })
    .limit(5)
    .populate("assessor", "name")
    .populate("participant", "name ndisNumber");

  return {
    users: {
      recent: recentUsers,
      stats: {
        total: totalUsers,
        admins: adminUsers,
        supervisors: supervisorUsers,
        assessors: assessorUsers,
        participants: participantUsers,
      },
    },
    participants: {
      stats: {
        total: totalParticipants,
        users: participantUsers,
        records: totalParticipantRecords,
      },
    },
    assignments: {
      recent: recentAssignments,
      stats: {
        total: totalAssignments,
        pending: pendingAssignments,
        active: activeAssignments,
        completed: completedAssignments,
      },
    },
    assessments: {
      recent: recentAssessments,
      stats: {
        total: totalAssessments,
        draft: draftAssessments,
        assigned: assignedAssessments,
        inProgress: inProgressAssessments,
        completed: completedAssessments,
        reviewed: reviewedAssessments,
      },
    },
  };
};

/**
 * Get summary statistics for the system
 * @param {*} req - Express request object
 * @param {*} res - Express response object
 */
exports.getSystemStats = async (req, res) => {
  try {
    // Ensure only admin or supervisor can access
    if (req.user.role !== "admin" && req.user.role !== "supervisor") {
      return res.status(403).json({
        success: false,
        message: "Permission denied",
      });
    }

    // Get user counts
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const usersByRole = {
      admin: await User.countDocuments({ role: "admin" }),
      supervisor: await User.countDocuments({ role: "supervisor" }),
      assessor: await User.countDocuments({ role: "assessor" }),
      participant: await User.countDocuments({ role: "participant" }),
    };

    // Get participant counts
    const participantRecords = await Participant.countDocuments();
    const totalParticipants = usersByRole.participant + participantRecords;

    // Get assessment counts
    const totalAssessments = await Assessment.countDocuments();
    const assessmentsByStatus = {
      Draft: await Assessment.countDocuments({ status: "Draft" }),
      Assigned: await Assessment.countDocuments({ status: "Assigned" }),
      InProgress: await Assessment.countDocuments({ status: "In Progress" }),
      Completed: await Assessment.countDocuments({ status: "Completed" }),
      Reviewed: await Assessment.countDocuments({ status: "Reviewed" }),
    };

    // Get assignment counts
    const totalAssignments = await Assignment.countDocuments();
    const assignmentsByStatus = {
      pending: await Assignment.countDocuments({ status: "pending" }),
      accepted: await Assignment.countDocuments({ status: "accepted" }),
      inProgress: await Assignment.countDocuments({ status: "in_progress" }),
      completed: await Assignment.countDocuments({ status: "completed" }),
      cancelled: await Assignment.countDocuments({ status: "cancelled" }),
    };

    // Get activity over time (last 12 months)
    const today = new Date();
    const twelveMonthsAgo = new Date(
      today.getFullYear(),
      today.getMonth() - 11,
      1
    );

    // Format monthly data
    const months = [];
    for (let i = 0; i < 12; i++) {
      const month = new Date(
        twelveMonthsAgo.getFullYear(),
        twelveMonthsAgo.getMonth() + i,
        1
      );
      months.push({
        month: month.toLocaleString("default", { month: "short" }),
        year: month.getFullYear(),
        assessments: 0,
        assignments: 0,
        participants: 0,
      });
    }

    // Get monthly assessment counts
    const assessmentMonthly = await Assessment.aggregate([
      {
        $match: {
          date: { $gte: twelveMonthsAgo },
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
    ]);

    // Get monthly assignment counts
    const assignmentMonthly = await Assignment.aggregate([
      {
        $match: {
          createdAt: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get monthly new participant counts
    const participantRecordsMonthly = await Participant.aggregate([
      {
        $match: {
          createdAt: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const participantUsersMonthly = await User.aggregate([
      {
        $match: {
          role: "participant",
          createdAt: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    // Populate monthly data
    assessmentMonthly.forEach((item) => {
      const monthIndex =
        (item._id.year - twelveMonthsAgo.getFullYear()) * 12 +
        (item._id.month - 1) -
        twelveMonthsAgo.getMonth();

      if (monthIndex >= 0 && monthIndex < 12) {
        months[monthIndex].assessments = item.count;
      }
    });

    assignmentMonthly.forEach((item) => {
      const monthIndex =
        (item._id.year - twelveMonthsAgo.getFullYear()) * 12 +
        (item._id.month - 1) -
        twelveMonthsAgo.getMonth();

      if (monthIndex >= 0 && monthIndex < 12) {
        months[monthIndex].assignments = item.count;
      }
    });

    // Combine participant records and users
    const combinedParticipantMonthly = [...participantRecordsMonthly];

    participantUsersMonthly.forEach((userItem) => {
      const existingItem = combinedParticipantMonthly.find(
        (item) =>
          item._id.year === userItem._id.year &&
          item._id.month === userItem._id.month
      );

      if (existingItem) {
        existingItem.count += userItem.count;
      } else {
        combinedParticipantMonthly.push(userItem);
      }
    });

    combinedParticipantMonthly.forEach((item) => {
      const monthIndex =
        (item._id.year - twelveMonthsAgo.getFullYear()) * 12 +
        (item._id.month - 1) -
        twelveMonthsAgo.getMonth();

      if (monthIndex >= 0 && monthIndex < 12) {
        months[monthIndex].participants = item.count;
      }
    });

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          byRole: usersByRole,
        },
        participants: {
          total: totalParticipants,
          users: usersByRole.participant,
          records: participantRecords,
        },
        assessments: {
          total: totalAssessments,
          byStatus: assessmentsByStatus,
        },
        assignments: {
          total: totalAssignments,
          byStatus: assignmentsByStatus,
        },
        monthly: months,
      },
    });
  } catch (err) {
    console.error("System stats error:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = exports;
