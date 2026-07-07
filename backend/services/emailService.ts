import nodemailer, { SentMessageInfo } from 'nodemailer';
import logger from '../config/logger';

interface SendWelcomeEmailArgs {
  studentName: string;
  email: string;
  passwordTemp: string;
  courseTitle: string;
  planName: string;
  batchName: string;
  mentorName: string;
  durationMonths: number;
  startDate: string;
  endDate: string;
}

export const sendWelcomeEmail = async ({
  studentName,
  email,
  passwordTemp,
  courseTitle,
  planName,
  batchName,
  mentorName,
  durationMonths,
  startDate,
  endDate,
}: SendWelcomeEmailArgs): Promise<SentMessageInfo> => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromName = process.env.SMTP_FROM_NAME || 'Techzon Wide';
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_FROM || 'support@techzonwide.com';
  const LMS_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!host || !user || !pass) {
    logger.error('SMTP email credentials are not configured in environment variables.');
    throw new Error('SMTP email credentials are not configured.');
  }

  if (!email || !email.trim()) {
    logger.error('Email recipient is missing or empty.', { email });
    throw new Error('Recipient email is required to send welcome email.');
  }

  console.log('SMTP HOST:', host);
  console.log('SMTP USER:', user);

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
    });

    await transporter.verify();
    logger.info('SMTP Connected Successfully', { host, port, user });
    console.log('SMTP Connected Successfully');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://lms.techzonwide.com/techzon-logo.png" alt="Techzon Wide" style="height: 50px; width: auto; margin-bottom: 10px; display: inline-block;" />
          <h2 style="color: #241252; margin: 0;">Techzon Wide LMS</h2>
          <p style="color: #F57C20; font-size: 14px; margin: 5px 0 0 0; font-weight: bold;">Your Professional Learning Platform</p>
        </div>
        
        <p style="font-size: 14px; color: #111827; line-height: 1.6;">Dear <strong>${studentName}</strong>,</p>
        <p style="font-size: 14px; color: #111827; line-height: 1.6;">Welcome to Techzon Wide! Your LMS student account has been successfully provisioned. You can now log in and begin your studies.</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin: 20px 0;">
          <h3 style="color: #31206B; margin: 0 0 10px 0; font-size: 14px;">Your Access Credentials & Plan Details</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 4px 0; color: #6b7280; font-weight: bold; width: 140px;">Login Email:</td>
              <td style="padding: 4px 0; color: #111827; font-weight: bold;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6b7280; font-weight: bold;">Temporary Password:</td>
              <td style="padding: 4px 0; color: #F57C20; font-family: monospace; font-size: 14px; font-weight: bold;">${passwordTemp}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6b7280; font-weight: bold;">Assigned Course:</td>
              <td style="padding: 4px 0; color: #111827;">${courseTitle}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6b7280; font-weight: bold;">Learning Plan:</td>
              <td style="padding: 4px 0; color: #111827;">${planName}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6b7280; font-weight: bold;">Course Duration:</td>
              <td style="padding: 4px 0; color: #111827;">${durationMonths} Months</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6b7280; font-weight: bold;">Access Start Date:</td>
              <td style="padding: 4px 0; color: #111827;">${startDate}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6b7280; font-weight: bold;">Access Expiry Date:</td>
              <td style="padding: 4px 0; color: #EF4444; font-weight: bold;">${endDate}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6b7280; font-weight: bold;">Batch Assignment:</td>
              <td style="padding: 4px 0; color: #111827;">${batchName}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6b7280; font-weight: bold;">Instructor Mentor:</td>
              <td style="padding: 4px 0; color: #111827;">${mentorName}</td>
            </tr>
          </table>
        </div>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="${LMS_URL}/login" style="background-color: #241252; color: #ffffff; padding: 12px 24px; border-radius: 6px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 14px;">Log In to LMS Dashboard</a>
        </div>
        
        <p style="font-size: 12px; color: #EF4444; font-weight: bold; line-height: 1.5; margin: 15px 0;">
          * For security purposes, you are required to change your temporary password immediately upon your first login attempt.
        </p>
        
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        
        <p style="font-size: 11px; color: #6b7280; line-height: 1.5; margin: 0;">
          For technical support or issues logging in, please contact:<br />
          <strong>Support Email:</strong> support@techzonwide.com | <strong>Support Helpline:</strong> +91 6374191654
        </p>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: 'Welcome to Techzon LMS – Your Learning Account is Ready',
      html: htmlContent,
    });

    logger.info('EMAIL RESULT', {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
      envelope: info.envelope,
    });
    console.log('Email Sent Successfully', {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    });
    return info;
  } catch (error: any) {
    logger.error('EMAIL FAILED', {
      message: error.message,
      code: error.code,
      response: error.response,
      stack: error.stack,
    });
    throw error;
  }
};
