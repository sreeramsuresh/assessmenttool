// models/Assignment.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AssignmentSchema = new Schema({
  supervisor: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  assessor: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  participant: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "in_progress", "completed", "cancelled"],
    default: "pending",
  },
  startDate: {
    type: Date,
  },
  dueDate: {
    type: Date,
  },
  completionDate: {
    type: Date,
  },
  assessments: [
    {
      type: Schema.Types.ObjectId,
      ref: "Assessment",
    },
  ],
  requiredSections: {
    type: [Number],
    default: [0, 1, 2, 3, 4, 5], // All sections by default
  },
  notes: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  // Track last activity on the assignment
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  lastActivityBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  lastActivityType: {
    type: String,
    enum: [
      "created",
      "updated",
      "status_changed",
      "assessment_created",
      "assessment_assigned",
      "assessment_started",
      "assessment_updated",
      "assessment_completed",
      "assessment_reviewed",
      "assessment_deleted",
      "note_added",
    ],
    default: "created",
  },
  history: [
    {
      action: {
        type: String,
        enum: [
          "created",
          "updated",
          "status_changed",
          "assessment_added",
          "assessment_removed",
          "note_added",
        ],
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
      user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      details: String,
      previousStatus: String,
    },
  ],
});

// Update timestamps on save
AssignmentSchema.pre("save", function (next) {
  this.updatedAt = Date.now();

  // If creating new assignment
  if (this.isNew) {
    this.history = [
      {
        action: "created",
        user: this.supervisor,
        details: "Assignment created",
        timestamp: this.createdAt,
      },
    ];

    this.lastActivity = this.createdAt;
    this.lastActivityBy = this.supervisor;
    this.lastActivityType = "created";
  }

  next();
});

// Method to add history entry
AssignmentSchema.methods.addHistoryEntry = async function (
  action,
  user,
  details,
  previousStatus
) {
  this.history.push({
    action,
    user,
    details,
    previousStatus,
    timestamp: new Date(),
  });

  return this.save();
};

// Method to update status
AssignmentSchema.methods.updateStatus = async function (
  newStatus,
  user,
  details
) {
  const oldStatus = this.status;
  this.status = newStatus;

  // Set specific date fields based on status
  if (newStatus === "accepted" && !this.startDate) {
    this.startDate = new Date();
  } else if (newStatus === "completed" && !this.completionDate) {
    this.completionDate = new Date();
  }

  // Update last activity info
  this.lastActivity = new Date();
  this.lastActivityBy = user;
  this.lastActivityType = "status_changed";

  // Add history entry
  return this.addHistoryEntry(
    "status_changed",
    user,
    details || `Status changed from ${oldStatus} to ${newStatus}`,
    oldStatus
  );
};

// Static method to get assignments for dashboard
AssignmentSchema.statics.getAssignmentsForDashboard = async function (
  userId,
  role
) {
  let query = {};

  // Filter based on role
  if (role === "supervisor") {
    query.supervisor = userId;
  } else if (role === "assessor") {
    query.assessor = userId;
  } else if (role === "participant") {
    query.participant = userId;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .populate("supervisor", "name")
    .populate("assessor", "name")
    .populate("participant", "name ndisNumber")
    .populate({
      path: "assessments",
      select: "status",
    });
};

module.exports = mongoose.model("Assignment", AssignmentSchema);
