import dotenv from "dotenv";
dotenv.config();

import { sendEmail } from "../services/email";

async function test(){
 await sendEmail({
  email:"v.hari2812@gmail.com",
  subject:"Resend Test",
  html:"<h1>Techzon LMS Email Working</h1>"
 });

 console.log("EMAIL SENT");
 process.exit();
}

test();
