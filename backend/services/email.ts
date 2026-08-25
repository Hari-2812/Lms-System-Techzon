import { BrevoClient } from '@getbrevo/brevo';
import logger from "../config/logger";

if (!process.env.BREVO_API_KEY) {
  throw new Error("CRITICAL: BREVO_API_KEY is missing during startup!");
}

const EMAIL_FROM_NAME = process.env.BREVO_SENDER_NAME || "Tech";
const EMAIL_FROM_EMAIL = process.env.BREVO_SENDER_EMAIL || "v.hari2812@gmail.com";

const brevoApiKey = process.env.BREVO_API_KEY;

logger.info(
  `[EMAIL] Brevo API key configured: ${Boolean(brevoApiKey)}`
);

const brevo = new BrevoClient({
  apiKey: brevoApiKey as string,
});

export const sendEmail = async (options: {
  email: string;
  subject: string;
  html: string;
  textContent?: string;
  attachments?: any[];
}) => {
  try {
    logger.info(`Sending Email:\nRecipient: ${options.email}\nSubject: ${options.subject}\nSender Name: ${EMAIL_FROM_NAME}\nSender Email: ${EMAIL_FROM_EMAIL}`);
    
    // In v6, brevo.transactionalEmails.sendTransacEmail expects the object directly
    // but building the SendSmtpEmail object is also fine if imported, but typically 
    // it's an object matching the schema. We'll pass it as an object directly.
    const result = await brevo.transactionalEmails.sendTransacEmail({
      subject: options.subject,
      htmlContent: options.html,
      textContent: options.textContent,
      sender: { name: EMAIL_FROM_NAME, email: EMAIL_FROM_EMAIL },
      to: [{ email: options.email }],
      attachment: options.attachments,
    });
    
    logger.info(`Email Sent Successfully:\nMessage ID: ${result.messageId}\nRecipient: ${options.email}\nStatus: Delivered`);

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
    
    // Throw a clean error for the frontend
    if (error.statusCode === 401 || (error.response && error.response.status === 401)) {
      throw new Error("Email service authentication failed. Please contact the administrator.");
    }
    throw new Error("Email delivery failed. Please contact the administrator.");
  }
};

export const sendWelcomeEmail = async (
  email: string,
  name: string,
  tempPassword?: string,
  otpCode?: string
): Promise<{ success: boolean; messageId: string }> => {
  const appName = process.env.APP_NAME || "Techzon LMS";
  const LOGIN_URL = "https://lms-system-techzon.vercel.app/login";
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
    <a href="${LOGIN_URL}" style="background-color: #F57C20; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
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

export const sendApprovalEmail = async (
  email: string,
  name: string,
  courseName: string,
  tempPassword?: string
): Promise<{ success: boolean; messageId: string }> => {
  if (!process.env.BREVO_API_KEY) {
    logger.warn('[EMAIL] Email service is not configured');
    throw new Error('Email service is not configured');
  }

  const FRONTEND_URL = process.env.FRONTEND_URL || "https://lms-system-techzon.vercel.app";
  const loginUrl = `${FRONTEND_URL}/login`;

  const passwordBlock = tempPassword 
    ? `
<div style="margin-top: 20px;">
  <p style="color: #333333; font-size: 15px; font-weight: bold; margin-bottom: 5px;">Temporary Password:</p>
  <div style="background-color: #f9f9f9; border: 1px dashed #cccccc; padding: 15px; border-radius: 8px; display: inline-block;">
    <h2 style="color: #F57C20; margin: 0; font-family: monospace; letter-spacing: 1px;">${tempPassword}</h2>
  </div>
</div>
<p style="color: #d9534f; font-size: 14px; font-weight: bold; margin-top: 15px;">
  IMPORTANT:<br/>
  This is a temporary password.<br/>
  For security, you MUST change your password after your first login.<br/>
  After logging in, you will automatically be asked to create a new password.
</p>`
    : `\n\n<p style="color: #555555; font-size: 15px;">Please use the existing LMS login/password setup process to access your account.</p>`;

  const html = `
<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #eaeaea; border-radius: 12px; background-color: #ffffff;">
  <p style="color: #333333; font-size: 16px;">Hello <strong>${name}</strong>,</p>
  <p style="color: #555555; font-size: 15px; line-height: 1.5;">Your student account has been approved and is ready to use.</p>
  
  <h3 style="color: #241252; margin-top: 25px; border-bottom: 1px solid #eee; padding-bottom: 10px;">Your LMS Login Details</h3>
  
  <p><strong>Course:</strong><br/>${courseName}</p>
  <p><strong>Login Email:</strong><br/>${email}</p>
  
  ${passwordBlock}
  
  <div style="text-align: center; margin: 35px 0;">
    <a href="${loginUrl}" style="background-color: #F57C20; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
      Login to LMS
    </a>
  </div>
  
  <p style="color: #555555; font-size: 14px;">If you have any questions, contact us at <a href="mailto:support@techzonwide.com" style="color: #F57C20;">support@techzonwide.com</a>.</p>
  
  <br/>
  <p style="color: #888; font-size: 14px;">Regards,<br/>Techzon Wide</p>
</div>
`;

  const textContent = tempPassword
    ? `Welcome to Techzon LMS System\n\nHello ${name},\nYour student account has been approved.\n\nCourse: ${courseName}\nLMS Login Email: ${email}\nTemporary Password: ${tempPassword}\nLogin: ${loginUrl}\n\nIMPORTANT: This is a temporary password. You must change your password after your first login.\n\nRegards,\nTechzon Wide\nsupport@techzonwide.com`
    : `Welcome to Techzon LMS System\n\nHello ${name},\nYour student account has been approved.\n\nCourse: ${courseName}\nLMS Login Email: ${email}\nLogin: ${loginUrl}\n\nPlease use the existing LMS login/password setup process to access your account.\n\nRegards,\nTechzon Wide\nsupport@techzonwide.com`;

  return await sendEmail({
    email,
    subject: `Your Techzon LMS Account Is Ready`,
    html,
    textContent
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
  const resetUrl = `https://lms-system-techzon.vercel.app/reset-password?token=${resetToken}`;

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

export const sendDailyReminderEmail = async (
  email: string,
  name: string
): Promise<{ success: boolean; messageId: string }> => {
  const FRONTEND_URL = process.env.FRONTEND_URL || "https://lms-system-techzon.vercel.app";
  const loginUrl = `${FRONTEND_URL}/login`;

  const html = `
<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #eaeaea; border-radius: 12px; background-color: #ffffff;">
  <p style="color: #333333; font-size: 16px;">Hello <strong>${name}</strong>,</p>
  <p style="color: #555555; font-size: 15px; line-height: 1.5;">This is a reminder that today's LMS class/video session will be available from 7:30 PM.</p>
  <p style="color: #555555; font-size: 15px; line-height: 1.5;">Your next learning video will be unlocked at 7:30 PM.</p>
  <p style="color: #555555; font-size: 15px; line-height: 1.5;">Please log in to the Techzon LMS and continue your course.</p>
  <div style="text-align: center; margin: 35px 0;">
    <a href="${loginUrl}" style="background-color: #F57C20; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
      Login to LMS
    </a>
  </div>
  <p style="color: #888888; font-size: 14px; margin-bottom: 5px;">Or copy and paste this URL into your browser:</p>
  <p style="color: #555555; font-size: 12px; word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">${loginUrl}</p>
  <br/>
  <p style="color: #888; font-size: 14px;">Regards,<br/>Techzon Wide<br/>LMS Team</p>
</div>
`;

  return await sendEmail({
    email,
    subject: `Today's LMS Class Starts at 7:30 PM`,
    html,
  });
};

export const sendCredentialsResetEmail = async (
  email: string,
  name: string,
  tempPassword: string
): Promise<{ success: boolean; messageId: string }> => {
  if (!process.env.BREVO_API_KEY) {
    logger.warn('[EMAIL] Email service is not configured');
    throw new Error('Email service is not configured');
  }

  const FRONTEND_URL = process.env.FRONTEND_URL || "https://lms-system-techzon.vercel.app";
  const loginUrl = `${FRONTEND_URL}/login`;

  const html = `
<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #eaeaea; border-radius: 12px; background-color: #ffffff;">
  <p style="color: #333333; font-size: 16px;">Hello <strong>${name}</strong>,</p>
  <p style="color: #555555; font-size: 15px; line-height: 1.5;">Your LMS login credentials have been reset by the administrator.</p>
  
  <h3 style="color: #241252; margin-top: 25px; border-bottom: 1px solid #eee; padding-bottom: 10px;">Your LMS Login Details</h3>
  
  <p><strong>Login Email:</strong><br/>${email}</p>
  
  <div style="margin-top: 20px;">
    <p style="color: #333333; font-size: 15px; font-weight: bold; margin-bottom: 5px;">Temporary Password:</p>
    <div style="background-color: #f9f9f9; border: 1px dashed #cccccc; padding: 15px; border-radius: 8px; display: inline-block;">
      <h2 style="color: #F57C20; margin: 0; font-family: monospace; letter-spacing: 1px;">${tempPassword}</h2>
    </div>
  </div>
  
  <p style="color: #d9534f; font-size: 14px; font-weight: bold; margin-top: 15px;">
    IMPORTANT:<br/>
    This is a temporary password.<br/>
    For security, you MUST change your password after your first login.<br/>
    After logging in, you will automatically be asked to create a new password.
  </p>
  
  <div style="text-align: center; margin: 35px 0;">
    <a href="${loginUrl}" style="background-color: #F57C20; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
      Login to LMS
    </a>
  </div>
  
  <p style="color: #555555; font-size: 14px;">If you have any questions, contact us at <a href="mailto:support@techzonwide.com" style="color: #F57C20;">support@techzonwide.com</a>.</p>
  
  <br/>
  <p style="color: #888; font-size: 14px;">Regards,<br/>Techzon Wide</p>
</div>
`;

  const textContent = `Welcome to Techzon LMS System\n\nHello ${name},\nYour LMS login credentials have been reset by the administrator.\n\nYour Login Email: ${email}\nYour Temporary Password: ${tempPassword}\n\nLogin to LMS: ${loginUrl}\n\nIMPORTANT:\nThis is a temporary password.\nFor security, you must change your password after logging in.\nAfter login, you will automatically be redirected to the password change screen.\n\nRegards,\nTechzon Wide\nsupport@techzonwide.com`;

  return await sendEmail({
    email,
    subject: `Your Techzon LMS Login Credentials`,
    html,
    textContent
  });
};