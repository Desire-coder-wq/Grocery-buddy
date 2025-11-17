const nodemailer = require('nodemailer');
require('dotenv').config();

// Create a transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Function to send password reset email
const sendPasswordResetEmail = async (to, resetUrl) => {
  try {
    const mailOptions = {
      from: `"Grocery Buddy" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: to,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Reset Your Password</h2>
          <p>You requested to reset your password. Click the button below to set a new password:</p>
          <div style="margin: 30px 0;">
            <a href="${resetUrl}" 
               style="display: inline-block; padding: 12px 24px; 
                      background: #667eea; color: white; 
                      text-decoration: none; border-radius: 4px;
                      font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p>${resetUrl}</p>
          <p>This link will expire in 1 hour for security reasons.</p>
          <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #777; font-size: 0.9em;">This is an automated message, please do not reply.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

// Function to send password changed confirmation
const sendPasswordChangedEmail = async (to) => {
  try {
    const mailOptions = {
      from: `"Grocery Buddy" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: to,
      subject: 'Password Changed Successfully',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Updated</h2>
          <p>Your password has been successfully changed.</p>
          <p>If you did not make this change, please contact us immediately at <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@example.com'}">support</a>.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #777; font-size: 0.9em;">This is an automated message, please do not reply.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password changed confirmation sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Error sending password changed email:', error);
    throw new Error('Failed to send password changed confirmation');
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendPasswordChangedEmail
};
