// routes/auth.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { check, validationResult } = require("express-validator");
const User = require("../models/User");
const auth = require("../middleware/auth");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post(
  "/register",
  [
    check("name", "Name is required").not().isEmpty(),
    check("email", "Please include a valid email").isEmail(),
    check("password", "Password must be at least 6 characters").isLength({
      min: 6,
    }),
    check("organization", "Organization is required").not().isEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { name, email, password, organization, position, role } = req.body;

    try {
      // Check if user exists
      let user = await User.findOne({ email });

      if (user) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Create confirmation token
      const confirmationToken = crypto.randomBytes(20).toString("hex");

      // Create new user
      user = new User({
        name,
        email,
        password,
        organization,
        position: position || "",
        role: role || "assessor", // Default role is assessor
        confirmationToken,
        isEmailConfirmed: process.env.NODE_ENV === "development", // Auto-confirm in development
      });

      await user.save();

      // Send confirmation email (except in development)
      if (process.env.NODE_ENV !== "development") {
        const confirmUrl = `${process.env.FRONTEND_URL}/confirm-email/${confirmationToken}`;

        const message = `
        <h1>Email Confirmation</h1>
        <p>Thank you for registering with the NDIS Assessment Tool. Please confirm your email by clicking on the link below:</p>
        <a href="${confirmUrl}" target="_blank">Confirm Email</a>
      `;

        try {
          await sendEmail({
            email: user.email,
            subject: "NDIS Assessment Tool - Email Confirmation",
            message,
          });
        } catch (err) {
          console.error("Error sending confirmation email:", err);
          // Continue despite email sending error
        }
      }

      // Create and return JWT
      const token = user.getSignedJwtToken();

      res.json({
        success: true,
        token,
        user: user.getPublicProfile(),
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  "/login",
  [
    check("email", "Please include a valid email").isEmail(),
    check("password", "Password is required").exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    try {
      // Check for user
      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message:
            "Your account has been deactivated. Please contact an administrator.",
        });
      }

      // Check if email is confirmed (except in development)
      if (process.env.NODE_ENV !== "development" && !user.isEmailConfirmed) {
        return res.status(401).json({
          success: false,
          message: "Please confirm your email address before logging in",
        });
      }

      // Check password
      const isMatch = await user.matchPassword(password);

      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Update last login time
      await user.updateLastLogin();

      // Create and return JWT
      const token = user.getSignedJwtToken();

      res.json({
        success: true,
        token,
        user: user.getPublicProfile(),
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// @route   GET api/auth/verify
// @desc    Verify token is valid
// @access  Private
router.get("/verify", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Your account has been deactivated",
      });
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

// @route   GET api/auth/confirm/:token
// @desc    Confirm email address
// @access  Public
router.get("/confirm/:token", async (req, res) => {
  try {
    const user = await User.findOne({ confirmationToken: req.params.token });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid confirmation token",
      });
    }

    // Update user
    user.isEmailConfirmed = true;
    user.confirmationToken = undefined;
    await user.save();

    res.json({
      success: true,
      message: "Email confirmed successfully. You can now log in.",
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   POST api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post(
  "/forgot-password",
  [check("email", "Please include a valid email").isEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    try {
      const user = await User.findOne({ email: req.body.email });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Generate reset token
      const resetToken = user.getResetPasswordToken();
      await user.save();

      // Create reset URL
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

      const message = `
      <h1>Password Reset</h1>
      <p>You are receiving this email because you (or someone else) has requested a password reset. Please click on the link below to reset your password:</p>
      <a href="${resetUrl}" target="_blank">Reset Password</a>
      <p>This link will expire in 10 minutes.</p>
      <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
    `;

      try {
        await sendEmail({
          email: user.email,
          subject: "NDIS Assessment Tool - Password Reset",
          message,
        });

        res.json({
          success: true,
          message: "Password reset email sent",
        });
      } catch (err) {
        console.error("Error sending reset email:", err);

        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        return res.status(500).json({
          success: false,
          message: "Email could not be sent",
        });
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// @route   POST api/auth/reset-password/:token
// @desc    Reset password
// @access  Public
router.post(
  "/reset-password/:token",
  [
    check("password", "Password must be at least 6 characters").isLength({
      min: 6,
    }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    try {
      // Get hashed token
      const resetToken = crypto
        .createHash("sha256")
        .update(req.params.token)
        .digest("hex");

      const user = await User.findOne({
        passwordResetToken: resetToken,
        passwordResetExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired token",
        });
      }

      // Set new password
      user.password = req.body.password;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      // Send notification
      await user.addNotification(
        "Your password has been changed successfully",
        "success"
      );

      res.json({
        success: true,
        message: "Password reset successful",
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// @route   GET api/auth/notifications
// @desc    Get user notifications
// @access  Private
router.get("/notifications", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      notifications: user.notifications,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   PUT api/auth/notifications/:id
// @desc    Mark notification as read
// @access  Private
router.put("/notifications/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await user.markNotificationAsRead(req.params.id);

    res.json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
