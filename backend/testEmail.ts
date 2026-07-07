import dotenv from 'dotenv';
import path from 'path';
import nodemailer from 'nodemailer';

dotenv.config({ path: path.join(__dirname, '.env') });

const host = process.env.SMTP_HOST;
const port = parseInt(process.env.SMTP_PORT || '587', 10);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const fromName = process.env.SMTP_FROM_NAME || 'Techzon Wide';
const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_FROM || user;
const toEmail = process.env.SMTP_USER;

if (!host || !user || !pass || !fromEmail) {
  console.error('Missing SMTP configuration in .env.');
  process.exit(1);
}

console.log('SMTP HOST:', host);
console.log('SMTP USER:', user);
console.log('SMTP FROM EMAIL:', fromEmail);

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user, pass },
  tls: { rejectUnauthorized: false },
});

(async () => {
  try {
    await transporter.verify();
    console.log('SMTP Connected');

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: toEmail,
      subject: 'Test Email from Techzon LMS SMTP',
      text: 'This is a test message verifying SMTP configuration for Techzon LMS.',
      html: '<p>This is a <strong>test message</strong> verifying SMTP configuration for Techzon LMS.</p>',
    });

    console.log('Email Sent Successfully');
    console.log('Message ID:', info.messageId);
    process.exit(0);
  } catch (error: any) {
    console.error('SMTP test failed:', {
      message: error.message,
      code: error.code,
      response: error.response,
      stack: error.stack,
    });
    process.exit(1);
  }
})();