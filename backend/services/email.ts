import { BrevoClient } from '@getbrevo/brevo';
import logger from "../config/logger";

const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY as string || "fallback",
});

export const sendEmail = async (options: {
  email: string;
  subject: string;
  html: string;
  attachments?: any[];
}) => {
  try {
    const appName = process.env.APP_NAME || "Techzon LMS";
    const fromAddress = "noreply@techzonwide.com"; // Set a generic noreply if not provided via options
    
    const result = await brevo.transactionalEmails.sendTransacEmail({
      subject: options.subject,
      htmlContent: options.html,
      sender: { name: appName, email: fromAddress },
      to: [{ email: options.email }],
      attachment: options.attachments,
    });

    logger.info(`EMAIL SENT SUCCESSFULLY | To: ${options.email} | Message ID: ${result.messageId}`);
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    logger.error("EMAIL SEND FAILED", {
      message: error.message,
      statusCode: error.statusCode || error.status,
      body: error.body || error.response?.data,
      recipient: options.email,
      subject: options.subject,
      stack: error.stack
    });
    throw error;
  }
};

export const sendWelcomeEmail = async (
  email: string,
  name: string,
  tempPassword?: string,
  otpCode?: string
): Promise<{ success: boolean; messageId: string }> => {
  const appName = process.env.APP_NAME || "Techzon LMS";
  const loginUrl = `${process.env.FRONTEND_URL || "https://lms-system-techzon.vercel.app"}/login`;
  const supportEmail = "support@techzonwide.com";

  const passwordBlock = tempPassword
    ? `
<p>Your LMS Temporary Password:</p>
<h2 style="color:#F57C20">${tempPassword}</h2>
<p>Please change your password after login.</p>
`
    : "";

  const otpBlock = otpCode
    ? `
<p>Your Verification OTP:</p>
<h2>${otpCode}</h2>
`
    : "";

  const html = `
<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #eaeaea; border-radius: 12px; background-color: #ffffff;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h2 style="color: #241252; margin: 0; font-size: 24px;">Welcome to ${appName}</h2>
  </div>
  <p style="color: #333333; font-size: 16px;">Hello <strong>${name}</strong>,</p>
  <p style="color: #555555; font-size: 15px; line-height: 1.5;">Your student account has been approved and is ready to use.</p>
  ${passwordBlock}
  ${otpBlock}
  <div style="text-align: center; margin: 35px 0;">
    <a href="${loginUrl}" style="background-color: #F57C20; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
      Login to LMS
    </a>
  </div>
  <p style="color: #555555; font-size: 14px;">If you have any questions, contact us at <a href="mailto:${supportEmail}" style="color: #F57C20;">${supportEmail}</a>.</p>
  <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
  <p style="color: #888888; font-size: 12px; text-align: center; margin: 0;">&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
</div>
`;

  return await sendEmail({
    email,
    subject: `Welcome to ${appName} - Account Activated`,
    html,
  });
};

export const sendOTPEmail = async (
  email: string,
  code: string
): Promise<{ success: boolean; messageId: string }> => {
  const appName = process.env.APP_NAME || "Techzon LMS";
  const html = `
<div style="font-family: 'Inter', Arial, sans-serif; max-width: 500px; margin: auto; padding: 25px; border: 1px solid #eaeaea; border-radius: 12px; background-color: #ffffff; text-align: center;">
  <h2 style="color: #241252; margin-top: 0;">${appName} Verification</h2>
  <p style="color: #555555; font-size: 16px;">Here is your verification code. This code expires in 10 minutes.</p>
  <h1 style="color: #F57C20; font-size: 36px; letter-spacing: 4px; margin: 20px 0; background-color: #f9f9f9; padding: 15px; border-radius: 8px; display: inline-block;">
    ${code}
  </h1>
  <p style="color: #888888; font-size: 12px; margin-bottom: 0;">If you didn't request this code, please ignore this email.</p>
</div>
`;

  return await sendEmail({
    email,
    subject: `${appName} OTP Verification`,
    html,
  });
};

export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string
): Promise<{ success: boolean; messageId: string }> => {
  const appName = process.env.APP_NAME || "Techzon LMS";
  const resetUrl = `${process.env.FRONTEND_URL || "https://lms-system-techzon.vercel.app"}/reset-password?token=${resetToken}`;

  const html = `
<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #eaeaea; border-radius: 12px; background-color: #ffffff;">
  <h2 style="color: #241252; text-align: center;">Reset Your Password</h2>
  <p style="color: #333333; font-size: 16px;">Hello,</p>
  <p style="color: #555555; font-size: 15px; line-height: 1.5;">We received a request to reset the password for your <strong>${appName}</strong> account.</p>
  <p style="color: #555555; font-size: 15px; line-height: 1.5;">Click the button below to choose a new password. This link will expire in 15 minutes.</p>
  <div style="text-align: center; margin: 35px 0;">
    <a href="${resetUrl}" style="background-color: #F57C20; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
      Reset Password
    </a>
  </div>
  <p style="color: #888888; font-size: 14px; margin-bottom: 5px;">Or copy and paste this URL into your browser:</p>
  <p style="color: #555555; font-size: 12px; word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">${resetUrl}</p>
  <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
  <p style="color: #888888; font-size: 12px; text-align: center; margin: 0;">If you didn't request a password reset, you can safely ignore this email.</p>
</div>
`;

  return await sendEmail({
    email,
    subject: `Reset Your Password - ${appName}`,
    html,
  });
};