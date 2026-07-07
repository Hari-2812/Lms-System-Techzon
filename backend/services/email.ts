import nodemailer from 'nodemailer';
import logger from '../config/logger';

const host = process.env.SMTP_HOST;
const port = parseInt(process.env.SMTP_PORT || '587');
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

if (!host || !user || !pass) {
  throw new Error('SMTP email credentials are not configured.');
}

console.log('SMTP HOST:', host);
console.log('SMTP USER:', user);

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user,
    pass,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

transporter.verify().then(() => console.log('SMTP Connected')).catch((error) => {
  logger.error('SMTP verification failed for generic email service:', {
    message: error.message,
    code: error.code,
    response: error.response,
    stack: error.stack,
  });
});

export const sendEmail = async (options: {
  email: string;
  subject: string;
  html: string;
  attachments?: any[];
}): Promise<void> => {
  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Techzon LMS'}" <${process.env.SMTP_FROM || process.env.SMTP_FROM_EMAIL || 'noreply@techzonwide.com'}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully: ${info.messageId} to ${options.email}`);
  } catch (error: any) {
    logger.error(`Failed to send email to ${options.email}:`, {
      message: error.message,
      code: error.code,
      response: error.response,
      stack: error.stack,
    });
    throw error;
  }
};

export const sendWelcomeEmail = async (
  email: string,
  name: string,
  tempPassword?: string,
  otpCode?: string
): Promise<void> => {
  const loginUrl = `${process.env.FRONTEND_URL}/login`;
  const otpSection = otpCode
    ? `<p>Your One-Time Passcode (OTP) for verifying your email is: <strong>${otpCode}</strong></p>`
    : '';

  const passwordSection = tempPassword
    ? `<p>Your temporary password for accessing the system is: <strong>${tempPassword}</strong></p>
       <p>Please change your password immediately after logging in.</p>`
    : '';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #241252; text-align: center;">Welcome to Techzon LMS!</h2>
      <p>Hello ${name},</p>
      <p>Thank you for onboarding at Techzon LMS. Your application has been approved by the Administrator and your account is now ready.</p>
      ${passwordSection}
      ${otpSection}
      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" style="background-color: #F57C20; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Login to LMS</a>
      </div>
      <p>If you have any questions, feel free to reply to this email or reach us at ${process.env.SUPPORT_EMAIL || 'support@techzonwide.com'}.</p>
      <p>Best regards,<br>Techzon Team</p>
    </div>
  `;

  await sendEmail({
    email,
    subject: 'Welcome to Techzon LMS - Enrollment Successful',
    html,
  });
};

export const sendOTPEmail = async (email: string, code: string): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #241252; text-align: center;">Your Techzon LMS Verification Code</h2>
      <p>Hello,</p>
      <p>You requested a verification passcode to access Techzon LMS System.</p>
      <div style="text-align: center; margin: 30px 0; background-color: #f7fafc; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #31206B;">
        ${code}
      </div>
      <p>This code is valid for 10 minutes. If you did not request this, you can ignore this email.</p>
      <p>Best regards,<br>Techzon Team</p>
    </div>
  `;

  await sendEmail({
    email,
    subject: 'Your Techzon LMS One-Time Passcode',
    html,
  });
};
