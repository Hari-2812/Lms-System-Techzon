import nodemailer from "nodemailer";
import logger from "../config/logger";


const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT || 465);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;


if (!host || !user || !pass) {
  throw new Error(
    "SMTP email credentials are not configured."
  );
}


console.log("SMTP HOST:", host);
console.log("SMTP USER:", user);



const transporter = nodemailer.createTransport({

  host,

  port,

  secure: true,

  auth: {

    user,

    pass

  },


  connectionTimeout: 60000,

  greetingTimeout: 30000,

  socketTimeout: 60000,


  tls: {

    rejectUnauthorized:false

  }

});



// VERIFY SMTP

transporter.verify()
.then(()=>{

 logger.info(
  "SMTP Connected Successfully"
 );

})
.catch((error)=>{

 logger.error(
  "SMTP verification failed:",
  {
   message:error.message,
   code:error.code,
   response:error.response
  }
 );

});





export const sendEmail = async(options:{
 email:string;
 subject:string;
 html:string;
 attachments?:any[];
}):Promise<void>=>{


 const mailOptions={

  from:
  `"${process.env.APP_NAME || "Techzon LMS"}" <${process.env.SMTP_USER}>`,


  to:
  options.email,


  subject:
  options.subject,


  html:
  options.html,


  attachments:
  options.attachments

 };


 try{


  const info =
  await transporter.sendMail(
    mailOptions
  );


  logger.info(
   `Email sent successfully ${info.messageId}`
  );


 }
 catch(error:any){


  logger.error(
   "SMTP SEND FAILED",
   {
    message:error.message,
    code:error.code,
    response:error.response
   }
  );


  throw error;


 }

};





export const sendWelcomeEmail = async(
 email:string,
 name:string,
 tempPassword?:string,
 otpCode?:string

):Promise<void>=>{


const loginUrl =
`${process.env.FRONTEND_URL}/login`;



const passwordSection =
tempPassword ?

`
<p>Your LMS login password:</p>

<h2>${tempPassword}</h2>

<p>Please change after login.</p>

`
:"";



const otpSection =
otpCode ?

`
<p>Your OTP:</p>

<h2>${otpCode}</h2>

`
:"";



const html =

`

<div style="
font-family:Arial;
padding:20px;
border-radius:10px;
border:1px solid #ddd;
">


<h2 style="color:#241252;">
Welcome to Techzon LMS
</h2>


<p>Hello ${name},</p>


<p>
Your enrollment has been approved.
</p>


${passwordSection}


${otpSection}



<a href="${loginUrl}"
style="
background:#F57C20;
color:white;
padding:12px 25px;
text-decoration:none;
border-radius:5px;
">

Login to LMS

</a>


<br/><br/>

<p>
Regards,<br/>
Techzon Team
</p>


</div>

`;



await sendEmail({

 email,

 subject:
 "Welcome to Techzon LMS - Account Activated",

 html

});

};






export const sendOTPEmail = async(
 email:string,
 code:string

):Promise<void>=>{


const html = `

<h2>Techzon LMS Verification</h2>

<p>Your OTP Code:</p>

<h1>${code}</h1>

<p>This code expires in 10 minutes.</p>

`;



await sendEmail({

 email,

 subject:
 "Techzon LMS OTP Verification",

 html

});

};