// models/Assessment.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AssessmentSchema = new Schema({
  // Participant details can now reference user directly for participants
  participant: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // Keep this for compatibility with existing assessments
  participantDetails: {
    fullName: String,
    ndisNumber: String,
    dateOfBirth: String,
    contactNumber: String,
    email: String,
    address: String,
  },
  // Selected assessment sections
  selectedSections: {
    type: [Number],
    required: true,
    validate: {
      validator: function (array) {
        return array && array.length > 0;
      },
      message: "At least one section must be selected",
    },
  },
  responses: {
    type: Map,
    of: Number,
    required: true,
  },
  comments: {
    type: Map,
    of: String,
  },
  sectionTitles: {
    type: [String],
    required: true,
    default: [
      "Personal Care & Daily Living Strengths",
      "Mobility & Accessibility Strengths",
      "Communication & Social Strengths",
      "Learning, Employment & Education Strengths",
      "Health & Well-being Strengths",
      "Safety & Independence Strengths",
    ],
  },
  questions: [
    {
      sectionIndex: {
        type: Number,
        required: true,
      },
      questionIndex: {
        type: Number,
        required: true,
      },
      text: {
        type: String,
        required: true,
      },
      isCustom: {
        type: Boolean,
        default: false,
      },
      createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    },
  ],
  customQuestions: [
    {
      sectionIndex: {
        type: Number,
        required: true,
      },
      text: {
        type: String,
        required: true,
      },
      createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    },
  ],
  totalScore: {
    type: Number,
    required: true,
  },
  interpretation: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: [
      "Draft",
      "Assigned",
      "In Progress",
      "Completed",
      "Pending Review",
      "Reviewed",
    ],
    default: "Draft",
  },
  assessor: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  assignedBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  assignedDate: {
    type: Date,
  },
  startDate: {
    type: Date,
  },
  completionDate: {
    type: Date,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  dueDate: {
    type: Date,
  },
  recommendationsNotes: String,
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  reviewDate: Date,
  reviewNotes: String,
  history: [
    {
      action: {
        type: String,
        enum: [
          "created",
          "updated",
          "status_changed",
          "reviewed",
          "assigned",
          "started",
          "completed",
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
    },
  ],
  assignmentId: {
    type: Schema.Types.ObjectId,
    ref: "Assignment",
  },
});

// Middleware to add history entry on assessment creation
AssessmentSchema.pre("save", function (next) {
  if (this.isNew) {
    this.history = [
      {
        action: "created",
        user: this.assessor,
        details: "Assessment created",
      },
    ];
  }

  // Update status based on events
  if (
    this.isModified("assignedDate") &&
    this.assignedDate &&
    this.status === "Draft"
  ) {
    this.status = "Assigned";
    this.history.push({
      action: "assigned",
      user: this.assignedBy || this.assessor,
      details: "Assessment assigned to participant",
      timestamp: this.assignedDate,
    });
  }

  if (
    this.isModified("startDate") &&
    this.startDate &&
    this.status === "Assigned"
  ) {
    this.status = "In Progress";
    this.history.push({
      action: "started",
      user: this.participant,
      details: "Assessment started by participant",
      timestamp: this.startDate,
    });
  }

  if (
    this.isModified("completionDate") &&
    this.completionDate &&
    this.status === "In Progress"
  ) {
    this.status = "Completed";
    this.history.push({
      action: "completed",
      user: this.participant,
      details: "Assessment completed by participant",
      timestamp: this.completionDate,
    });
  }

  next();
});

// Virtual for calculating section averages
AssessmentSchema.virtual("sectionAverages").get(function () {
  const averages = [];

  for (let i = 0; i < this.sectionTitles.length; i++) {
    // Skip if this section wasn't selected
    if (!this.selectedSections.includes(i)) {
      continue;
    }

    let sum = 0;
    let count = 0;

    for (const key in this.responses) {
      if (key.startsWith(`${i}-`)) {
        sum += this.responses[key];
        count++;
      }
    }

    averages.push({
      section: this.sectionTitles[i],
      average: count > 0 ? parseFloat((sum / count).toFixed(1)) : 0,
    });
  }

  return averages;
});

// Virtual for identifying strengths
AssessmentSchema.virtual("strengths").get(function () {
  const strengths = [];

  this.questions.forEach((q) => {
    // Skip if this section wasn't selected
    if (!this.selectedSections.includes(q.sectionIndex)) {
      return;
    }

    const response = this.responses[`${q.sectionIndex}-${q.questionIndex}`];

    if (response <= 2) {
      strengths.push({
        section: this.sectionTitles[q.sectionIndex],
        question: q.text,
        rating: response,
      });
    }
  });

  return strengths;
});

// Virtual for identifying areas needing support
AssessmentSchema.virtual("supportNeeds").get(function () {
  const needs = [];

  this.questions.forEach((q) => {
    // Skip if this section wasn't selected
    if (!this.selectedSections.includes(q.sectionIndex)) {
      return;
    }

    const response = this.responses[`${q.sectionIndex}-${q.questionIndex}`];

    if (response >= 4) {
      needs.push({
        section: this.sectionTitles[q.sectionIndex],
        question: q.text,
        rating: response,
      });
    }
  });

  return needs;
});

// Method to get assessment summary
AssessmentSchema.methods.getSummary = function () {
  const summary = {
    _id: this._id,
    date: this.date,
    totalScore: this.totalScore,
    interpretation: this.interpretation,
    status: this.status,
    sectionAverages: this.sectionAverages,
    strengths: this.strengths.length,
    supportNeeds: this.supportNeeds.length,
  };

  // If the assessment is linked to a participant user
  if (this.participant) {
    summary.participantId = this.participant;
  } else {
    // For backward compatibility with older assessments
    summary.participantName = this.participantDetails.fullName;
    summary.ndisNumber = this.participantDetails.ndisNumber;
  }

  return summary;
};

// Method to add history entry
AssessmentSchema.methods.addHistoryEntry = async function (
  action,
  user,
  details
) {
  this.history.push({
    action,
    user,
    details,
    timestamp: new Date(),
  });

  return this.save();
};

// Method to update status
AssessmentSchema.methods.updateStatus = async function (
  newStatus,
  user,
  details
) {
  const oldStatus = this.status;
  this.status = newStatus;

  // Add specific date fields based on status
  if (newStatus === "Assigned" && !this.assignedDate) {
    this.assignedDate = new Date();
  } else if (newStatus === "In Progress" && !this.startDate) {
    this.startDate = new Date();
  } else if (newStatus === "Completed" && !this.completionDate) {
    this.completionDate = new Date();
  } else if (newStatus === "Reviewed" && !this.reviewDate) {
    this.reviewDate = new Date();
    this.reviewedBy = user;
  }

  return this.addHistoryEntry(
    "status_changed",
    user,
    details || `Status changed from ${oldStatus} to ${newStatus}`
  );
};

module.exports = mongoose.model("Assessment", AssessmentSchema);
