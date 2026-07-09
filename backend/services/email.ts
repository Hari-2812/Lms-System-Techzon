import nodemailer from "nodemailer";
import logger from "../config/logger";


const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;


if (!user || !pass) {
  throw new Error(
    "SMTP email credentials are not configured."
  );
}


console.log(
  "SMTP USER:",
  user
);


const transporter = nodemailer.createTransport({

  service: "gmail",

  auth: {
    user,
    pass
  },

  pool: true,

  maxConnections: 1,

  maxMessages: 5,

  connectionTimeout: 120000,

  greetingTimeout: 60000,

  socketTimeout: 120000,

});



// SMTP TEST

transporter.verify((error: any) => {

 if (error) {

  logger.error(
   "SMTP CONNECTION FAILED",
   {
    message: error.message,
    code: error.code,
    response: error.response
   }
  );

 }

 else {

  logger.info(
   "SMTP CONNECTED SUCCESSFULLY"
  );

 }

});




// SEND EMAIL FUNCTION

export const sendEmail = async(options:{
 email:string;
 subject:string;
 html:string;
 attachments?:any[];

}):Promise<void>=>{


try{


const info =
await transporter.sendMail({


 from:
 `"${process.env.APP_NAME || "Techzon LMS"}" <${user}>`,


 to:
 options.email,


 subject:
 options.subject,


 html:
 options.html,


 attachments:
 options.attachments


});


logger.info(
 `Email sent successfully: ${info.messageId}`
);


}


catch(error:any){


logger.error(
 "EMAIL SEND FAILED",
 {
  message:error.message,
  code:error.code,
  response:error.response
 }
);


throw error;


}


};




// WELCOME EMAIL

export const sendWelcomeEmail = async(

 email:string,

 name:string,

 tempPassword?:string,

 otpCode?:string


):Promise<void>=>{


const loginUrl =
`${process.env.FRONTEND_URL}/login`;



const passwordSection =
tempPassword
?

`

<p>Your LMS Login Password:</p>

<h2>${tempPassword}</h2>

<p>Please change your password after login.</p>

`

:"";




const otpSection =
otpCode
?

`

<p>Your Verification OTP:</p>

<h2>${otpCode}</h2>

`

:"";




const html = `


<div style="
font-family:Arial;
padding:20px;
border:1px solid #ddd;
border-radius:10px;
">


<h2 style="color:#241252">
Welcome to Techzon LMS
</h2>


<p>Hello ${name},</p>


<p>
Your student account has been approved successfully.
</p>


${passwordSection}


${otpSection}



<a href="${loginUrl}"

style="
background:#F57C20;
padding:12px 25px;
color:white;
text-decoration:none;
border-radius:5px;
">

Login LMS

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




// OTP EMAIL


export const sendOTPEmail = async(

email:string,

code:string


):Promise<void>=>{


const html = `


<h2>Techzon LMS Verification</h2>


<p>Your OTP code:</p>


<h1>${code}</h1>


<p>
This OTP expires in 10 minutes.
</p>


`;



await sendEmail({

 email,

 subject:
 "Techzon LMS OTP Verification",

 html


});


};