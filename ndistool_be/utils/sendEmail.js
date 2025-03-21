// utils/sendEmail.js
const nodemailer = require("nodemailer");

/**
 * Send email using nodemailer
 *
 * @param {Object} options Email options
 * @param {String} options.email Recipient email
 * @param {String} options.subject Email subject
 * @param {String} options.message Email message (HTML format)
 * @returns {Promise} Nodemailer send response
 */
const sendEmail = async (options) => {
  // Create a transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  // Define email options
  const mailOptions = {
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    html: options.message,
  };

  // In development, log email instead of sending
  if (
    process.env.NODE_ENV === "development" &&
    process.env.SEND_EMAILS !== "true"
  ) {
    console.log("======= EMAIL OUTPUT =======");
    console.log(`To: ${mailOptions.to}`);
    console.log(`Subject: ${mailOptions.subject}`);
    console.log(mailOptions.html);
    console.log("====== END EMAIL OUTPUT =====");

    // Return success without actually sending
    return { success: true, info: "Email logged in development mode" };
  }

  // Send email
  const info = await transporter.sendMail(mailOptions);

  return info;
};

module.exports = sendEmail;
