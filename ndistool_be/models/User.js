// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "Please provide a valid email",
    ],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: 6,
    select: false, // Don't return password by default
  },
  role: {
    type: String,
    enum: ["assessor", "supervisor", "admin", "participant"],
    default: "assessor",
  },
  organization: {
    type: String,
    required: function () {
      return this.role !== "participant"; // Only required for non-participants
    },
  },
  position: String,
  profileImage: String,
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  confirmationToken: String,
  isEmailConfirmed: {
    type: Boolean,
    default: false,
  },
  notifications: [
    {
      message: String,
      type: {
        type: String,
        enum: ["info", "warning", "success", "error", "assignment"],
        default: "info",
      },
      isRead: {
        type: Boolean,
        default: false,
      },
      date: {
        type: Date,
        default: Date.now,
      },
      link: String,
    },
  ],
  // Participant specific fields
  ndisNumber: {
    type: String,
    sparse: true, // Allows null/undefined values but enforces uniqueness when present
    trim: true,
  },
  dateOfBirth: Date,
  contactNumber: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  // Fields for tracking assignments
  assignedAssessors: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  assignedParticipants: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  assignedBy: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  // Tracking if this is a participant created from existing participant data
  linkedParticipantId: {
    type: Schema.Types.ObjectId,
    ref: "Participant",
  },
});

// Encrypt password using bcrypt
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || "24h",
    }
  );
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password reset token
UserSchema.methods.getResetPasswordToken = function () {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString("hex");

  // Hash token and set to resetPasswordToken field
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set expire (10 minutes)
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// Add notification
UserSchema.methods.addNotification = async function (
  message,
  type = "info",
  link = ""
) {
  this.notifications.unshift({
    message,
    type,
    link,
    date: new Date(),
    isRead: false,
  });

  // Keep only the 20 most recent notifications
  if (this.notifications.length > 20) {
    this.notifications = this.notifications.slice(0, 20);
  }

  return this.save();
};

// Mark notification as read
UserSchema.methods.markNotificationAsRead = async function (notificationId) {
  const notification = this.notifications.id(notificationId);

  if (notification) {
    notification.isRead = true;
    return this.save();
  }

  return this;
};

// Update last login
UserSchema.methods.updateLastLogin = async function () {
  this.lastLogin = new Date();
  return this.save();
};

// Get public profile (safe to send to frontend)
UserSchema.methods.getPublicProfile = function () {
  const profile = {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    organization: this.organization,
    position: this.position,
    profileImage: this.profileImage,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
    isEmailConfirmed: this.isEmailConfirmed,
    unreadNotifications: this.notifications.filter((n) => !n.isRead).length,
  };

  // Add participant-specific fields if applicable
  if (this.role === "participant") {
    profile.ndisNumber = this.ndisNumber;
    profile.dateOfBirth = this.dateOfBirth;
    profile.contactNumber = this.contactNumber;
    profile.address = this.address;
  }

  return profile;
};

// Get all assessors (static method)
UserSchema.statics.getAssessors = async function () {
  return await this.find({ role: "assessor", isActive: true })
    .select("name email organization position")
    .sort("name");
};

// Get all supervisors (static method)
UserSchema.statics.getSupervisors = async function () {
  return await this.find({ role: "supervisor", isActive: true })
    .select("name email organization position")
    .sort("name");
};

// Get all participants (static method)
UserSchema.statics.getParticipants = async function () {
  return await this.find({ role: "participant", isActive: true })
    .select("name email ndisNumber dateOfBirth contactNumber")
    .sort("name");
};

module.exports = mongoose.model("User", UserSchema);
