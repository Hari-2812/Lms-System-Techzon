import { Resend } from "resend";
import logger from "../config/logger";

const resend = new Resend(process.env.RESEND_API_KEY);

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY missing");
}

export const sendEmail = async (options: {
  email: string;
  subject: string;
  html: string;
  attachments?: any[];
}) => {
  try {
    const result = await resend.emails.send({
      from: "Techzon LMS <onboarding@resend.dev>",
      to: options.email,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });

    logger.info("EMAIL SENT SUCCESSFULLY");
    return result;
  } catch (error) {
    logger.error("EMAIL SEND FAILED", error);
    throw error;
  }
};

export const sendWelcomeEmail = async (
  email: string,
  name: string,
  tempPassword?: string,
  otpCode?: string
): Promise<void> => {
  const loginUrl = `${process.env.FRONTEND_URL || 'https://lms-system-techzon.vercel.app'}/login`;

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
<div style="font-family:Arial;max-width:600px;margin:auto;padding:20px;border:1px solid #ddd;border-radius:10px;">
  <h2 style="color:#241252;text-align:center;">Welcome to Techzon LMS</h2>
  <p>Hello ${name},</p>
  <p>Your student account has been approved successfully.</p>
  ${passwordBlock}
  ${otpBlock}
  <div style="text-align:center;margin:30px">
    <a href="${loginUrl}" style="background:#F57C20;color:white;padding:12px 25px;text-decoration:none;border-radius:6px;">
      Login LMS
    </a>
  </div>
  <p>Regards,<br/>Techzon Team</p>
</div>
`;

  await sendEmail({
    email,
    subject: "Welcome to Techzon LMS - Account Activated",
    html,
  });
};

export const sendOTPEmail = async (
  email: string,
  code: string
): Promise<void> => {
  const html = `
<div style="font-family:Arial">
  <h2>Techzon LMS Verification</h2>
  <p>Your OTP Code:</p>
  <h1>${code}</h1>
  <p>This code expires in 10 minutes.</p>
</div>
`;

  await sendEmail({
    email,
    subject: "Techzon LMS OTP Verification",
    html,
  });
};