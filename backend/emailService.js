import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables at the top of this file
dotenv.config();

// Debug: Check if environment variables are loaded
console.log('EMAIL_USER:', process.env.EMAIL_USER ? `Found: ${process.env.EMAIL_USER}` : 'Missing');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'Found (hidden)' : 'Missing');

// Create email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify email configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email configuration error:', error);
  } else {
    console.log('✅ Email service ready');
  }
});

// Send verification email
export const sendVerificationEmail = async (email, name, token) => {
  const verificationUrl = `http://localhost:3000/api/auth/verify/${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Welcome to RentRush! Please verify your email',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0b74ff; color: white; padding: 20px; text-align: center;">
          <h1>Welcome to RentRush!</h1>
        </div>
        <div style="padding: 30px;">
          <h2>Hi ${name},</h2>
          <p>Thanks for signing up for RentRush! We're excited to help you find your perfect rental.</p>
          <p>To get started receiving rental alerts, please verify your email address:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background: #0b74ff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
              Verify My Email
            </a>
          </div>
          
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          
          <p>This link will expire in 24 hours.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">
            If you didn't sign up for RentRush, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent to:', email);
    return true;
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return false;
  }
};

export default { sendVerificationEmail };