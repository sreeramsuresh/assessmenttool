// utils/notificationManager.js
const User = require("../models/User");
const sendEmail = require("./sendEmail");

/**
 * Send notification to a user
 * @param {string} userId - User ID
 * @param {string} message - Notification message
 * @param {string} type - Notification type: "info", "warning", "success", "error", "assignment"
 * @param {string} link - Optional link to associated resource
 * @param {boolean} sendEmailNotification - Whether to also send an email notification
 * @returns {Promise<boolean>} Success status
 */
const sendNotification = async (
  userId,
  message,
  type = "info",
  link = "",
  sendEmailNotification = false
) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      console.error(`Cannot send notification: User ID ${userId} not found`);
      return false;
    }

    // Add in-app notification
    await user.addNotification(message, type, link);

    // Send email notification if enabled
    if (sendEmailNotification && process.env.SEND_EMAILS === "true") {
      try {
        const emailSubject = `NDIS Assessment Tool - ${getTypeLabel(type)}`;

        // Build email message
        let emailMessage = `
          <h1>${getTypeLabel(type)}</h1>
          <p>${message}</p>
        `;

        // Add link to application if provided
        if (link) {
          const appUrl = process.env.FRONTEND_URL || "http://localhost:3000";
          emailMessage += `
            <p><a href="${appUrl}${link}" target="_blank">View in Application</a></p>
          `;
        }

        // Add standard footer
        emailMessage += `
          <hr>
          <p style="font-size: 12px; color: #666;">
            This is an automated notification from the NDIS Assessment Tool. 
            If you have any questions, please contact your administrator.
          </p>
        `;

        // Send the email
        await sendEmail({
          email: user.email,
          subject: emailSubject,
          message: emailMessage,
        });
      } catch (emailErr) {
        console.error(
          `Email notification error for user ${userId}:`,
          emailErr.message
        );
        // Continue despite email error - in-app notification was still added
      }
    }

    return true;
  } catch (err) {
    console.error(`Notification error for user ${userId}:`, err.message);
    return false;
  }
};

/**
 * Send notification to multiple users
 * @param {string[]} userIds - Array of user IDs
 * @param {string} message - Notification message
 * @param {string} type - Notification type: "info", "warning", "success", "error", "assignment"
 * @param {string} link - Optional link to associated resource
 * @param {boolean} sendEmailNotification - Whether to also send an email notification
 * @returns {Promise<Object>} Status of each notification
 */
const sendBulkNotifications = async (
  userIds,
  message,
  type = "info",
  link = "",
  sendEmailNotification = false
) => {
  const results = {};

  for (const userId of userIds) {
    results[userId] = await sendNotification(
      userId,
      message,
      type,
      link,
      sendEmailNotification
    );
  }

  return results;
};

/**
 * Send notifications to users by role
 * @param {string} role - User role: "admin", "supervisor", "assessor", "participant"
 * @param {string} message - Notification message
 * @param {string} type - Notification type: "info", "warning", "success", "error", "assignment"
 * @param {string} link - Optional link to associated resource
 * @param {boolean} sendEmailNotification - Whether to also send an email notification
 * @returns {Promise<Object>} Status of each notification
 */
const sendRoleNotifications = async (
  role,
  message,
  type = "info",
  link = "",
  sendEmailNotification = false
) => {
  try {
    // Get all active users with the specified role
    const users = await User.find({
      role,
      isActive: true,
      isEmailConfirmed: true,
    }).select("_id");

    const userIds = users.map((user) => user._id.toString());

    return await sendBulkNotifications(
      userIds,
      message,
      type,
      link,
      sendEmailNotification
    );
  } catch (err) {
    console.error(`Role notification error for ${role}:`, err.message);
    return { error: err.message };
  }
};

/**
 * Get notification type human-readable label
 * @param {string} type - Notification type
 * @returns {string} Human-readable label
 */
const getTypeLabel = (type) => {
  switch (type) {
    case "info":
      return "Information";
    case "warning":
      return "Warning";
    case "success":
      return "Success";
    case "error":
      return "Error";
    case "assignment":
      return "Assignment Notification";
    default:
      return "Notification";
  }
};

/**
 * Notification types - for reference
 */
const NOTIFICATION_TYPES = {
  INFO: "info",
  WARNING: "warning",
  SUCCESS: "success",
  ERROR: "error",
  ASSIGNMENT: "assignment",
};

// Specific notification senders for common events

/**
 * Send assignment notification to an assessor
 * @param {string} assessorId - Assessor user ID
 * @param {Object} assignment - Assignment object
 * @param {boolean} sendEmail - Whether to also send an email
 */
const notifyAssessorAssigned = async (
  assessorId,
  assignment,
  sendEmail = false
) => {
  const message = `You have been assigned to work with participant: ${assignment.participant.name}`;
  const link = `/assignments/${assignment._id}`;

  return await sendNotification(
    assessorId,
    message,
    NOTIFICATION_TYPES.ASSIGNMENT,
    link,
    sendEmail
  );
};

/**
 * Send assessment notification to a participant
 * @param {string} participantId - Participant user ID
 * @param {Object} assessment - Assessment object
 * @param {boolean} sendEmail - Whether to also send an email
 */
const notifyParticipantAssessment = async (
  participantId,
  assessment,
  sendEmail = false
) => {
  const message = `You have a new assessment to complete`;
  const link = `/assessments/${assessment._id}`;

  return await sendNotification(
    participantId,
    message,
    NOTIFICATION_TYPES.ASSIGNMENT,
    link,
    sendEmail
  );
};

/**
 * Send assessment completion notification to an assessor
 * @param {string} assessorId - Assessor user ID
 * @param {Object} assessment - Assessment object
 * @param {Object} participant - Participant user object
 * @param {boolean} sendEmail - Whether to also send an email
 */
const notifyAssessorCompletion = async (
  assessorId,
  assessment,
  participant,
  sendEmail = false
) => {
  const message = `${participant.name} has completed their assessment`;
  const link = `/assessments/${assessment._id}`;

  return await sendNotification(
    assessorId,
    message,
    NOTIFICATION_TYPES.SUCCESS,
    link,
    sendEmail
  );
};

/**
 * Send assessment review notification to a participant
 * @param {string} participantId - Participant user ID
 * @param {Object} assessment - Assessment object
 * @param {boolean} sendEmail - Whether to also send an email
 */
const notifyParticipantReviewed = async (
  participantId,
  assessment,
  sendEmail = false
) => {
  const message = `Your assessment has been reviewed`;
  const link = `/assessments/${assessment._id}`;

  return await sendNotification(
    participantId,
    message,
    NOTIFICATION_TYPES.INFO,
    link,
    sendEmail
  );
};

module.exports = {
  sendNotification,
  sendBulkNotifications,
  sendRoleNotifications,
  NOTIFICATION_TYPES,
  notifyAssessorAssigned,
  notifyParticipantAssessment,
  notifyAssessorCompletion,
  notifyParticipantReviewed,
};
