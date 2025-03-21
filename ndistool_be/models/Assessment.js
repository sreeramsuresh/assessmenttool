// models/Assessment.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AssessmentSchema = new Schema({
  participantDetails: {
    fullName: {
      type: String,
      required: true,
    },
    ndisNumber: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: String,
      required: true,
    },
    contactNumber: String,
    email: String,
    address: String,
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
    enum: ["Completed", "Pending Review", "Reviewed"],
    default: "Completed",
  },
  assessor: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
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
        enum: ["created", "updated", "status_changed", "reviewed"],
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
  next();
});

// Virtual for calculating section averages
AssessmentSchema.virtual("sectionAverages").get(function () {
  const averages = [];

  for (let i = 0; i < this.sectionTitles.length; i++) {
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
  return {
    _id: this._id,
    participantName: this.participantDetails.fullName,
    ndisNumber: this.participantDetails.ndisNumber,
    date: this.date,
    totalScore: this.totalScore,
    interpretation: this.interpretation,
    status: this.status,
    sectionAverages: this.sectionAverages,
    strengths: this.strengths.length,
    supportNeeds: this.supportNeeds.length,
  };
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

module.exports = mongoose.model("Assessment", AssessmentSchema);
