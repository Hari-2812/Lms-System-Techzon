import dotenv from "dotenv";
dotenv.config();

import { sendEmail } from "../services/email";

async function runTest() {
  console.log("Starting email test...");
  try {
    const result = await sendEmail({
      email: "test@example.com", // You can change this to your email to test real delivery
      subject: "Test Email from Techzon LMS Backend",
      html: "<h1>Email Test Successful!</h1><p>Your Brevo SMTP configuration is working perfectly.</p>",
    });
    console.log("Email Sent Successfully");
    console.log("Message ID:", result.messageId);
    process.exit(0);
  } catch (error) {
    console.error("Email Test Failed:");
    console.error(error);
    process.exit(1);
  }
}

runTest();
