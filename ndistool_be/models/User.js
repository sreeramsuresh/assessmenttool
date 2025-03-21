// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
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
    enum: ["assessor", "supervisor", "admin"],
    default: "assessor",
  },
  organization: {
    type: String,
    required: [true, "Organization is required"],
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
        enum: ["info", "warning", "success", "error"],
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
  return {
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

module.exports = mongoose.model("User", UserSchema);
