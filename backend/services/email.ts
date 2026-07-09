import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import logger from "../config/logger";
import dns from "dns";


// FORCE IPv4 ON RENDER
dns.setDefaultResultOrder("ipv4first");


// ENV
const host = process.env.SMTP_HOST || "smtp.gmail.com";
const port = Number(process.env.SMTP_PORT || 587);

const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;


if (!user || !pass) {

  throw new Error(
    "SMTP email credentials are not configured."
  );

}


console.log(
  "SMTP HOST:",
  host
);


console.log(
  "SMTP USER:",
  user
);




// SMTP CONFIG

const smtpOptions: SMTPTransport.Options = {


  host,


  port,


  // Gmail 587 STARTTLS
  secure: false,


  requireTLS: true,


  auth: {

    user,

    pass

  },


  tls: {

    rejectUnauthorized: false,

    servername: "smtp.gmail.com"

  },


  connectionTimeout: 60000,


  greetingTimeout: 30000,


  socketTimeout: 60000


};





const transporter =
nodemailer.createTransport(
  smtpOptions
);





// VERIFY SMTP

transporter.verify()

.then(()=>{


 logger.info(
   "SMTP CONNECTED SUCCESSFULLY"
 );


})


.catch((error:any)=>{


 logger.error(
  "SMTP CONNECTION FAILED",
  {

    message:error.message,

    code:error.code,

    response:error.response

  }
 );


});








// SEND EMAIL FUNCTION

export const sendEmail = async(

options:{

 email:string;

 subject:string;

 html:string;

 attachments?:any[];

}

):Promise<void>=>{


try{


console.log(
 "Email Sending Started"
);



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

 `EMAIL SENT SUCCESSFULLY ${info.messageId}`

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











// STUDENT WELCOME EMAIL


export const sendWelcomeEmail = async(


 email:string,


 name:string,


 tempPassword?:string,


 otpCode?:string



):Promise<void>=>{



const loginUrl =
`${process.env.FRONTEND_URL}/login`;





const passwordBlock =

tempPassword ?

`

<p>Your LMS Temporary Password:</p>

<h2 style="color:#F57C20">
${tempPassword}
</h2>

<p>
Please change your password after login.
</p>

`

:

"";





const otpBlock =

otpCode ?

`

<p>Your Verification OTP:</p>

<h2>
${otpCode}
</h2>

`

:

"";






const html = `


<div style="
font-family:Arial;
max-width:600px;
margin:auto;
padding:20px;
border:1px solid #ddd;
border-radius:10px;
">


<h2 style="
color:#241252;
text-align:center;
">

Welcome to Techzon LMS

</h2>



<p>Hello ${name},</p>


<p>
Your student account has been approved successfully.
</p>


${passwordBlock}


${otpBlock}



<div style="text-align:center;margin:30px">


<a href="${loginUrl}"

style="
background:#F57C20;
color:white;
padding:12px 25px;
text-decoration:none;
border-radius:6px;
"

>

Login LMS

</a>


</div>


<p>

Regards,

<br/>

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


<div style="font-family:Arial">


<h2>

Techzon LMS Verification

</h2>



<p>

Your OTP Code:

</p>



<h1>

${code}

</h1>



<p>

This code expires in 10 minutes.

</p>



</div>


`;





await sendEmail({


 email,


 subject:

 "Techzon LMS OTP Verification",


 html


});



};