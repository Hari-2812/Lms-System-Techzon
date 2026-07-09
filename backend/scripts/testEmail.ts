import dotenv from "dotenv";
dotenv.config();

import {sendEmail} from "../services/email";

async function test(){
 await sendEmail({
  email:"v.hari2812@gmail.com",
  subject:"Techzon SMTP Test",
  html:"<h1>Email Working</h1>"
 });
 console.log("TEST EMAIL SENT");
 process.exit();
}

test();
