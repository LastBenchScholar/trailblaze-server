const nodemailer = require("nodemailer");

/**
 * Uses Nodemailer for sending emails
 * Configuration is done via Gmail SMTP
 * Note: Change password in .env for ensuring no errors while sending email. The password is a APP Password key of your gmail account.
 */
module.exports.sendEmail = (email, subject, message) => {
  return new Promise((resolve, reject) => {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
      },
    });
    const mailOptions = {
      from: process.env.MAIL_USERNAME,
      to: email,
      subject,
      html: `<p>${message}</p>`,
    };
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.log(`Email Error: ${err}`);
        resolve(false);
      } else {
        console.log("Email sent");
        resolve(true);
      }
    });
  });
};

/**
 * Custom error class to represent HTTP errors with a status code.
 * Extends the built-in Error class to include an HTTP status code.
 */
class AppError extends Error {
  /**
   * Create an AppError instance.
   *
   * @param {string} message - The error message.
   * @param {number} [statusCode=500] - The HTTP status code.
   */
  constructor(message, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}
module.exports.AppError = AppError;