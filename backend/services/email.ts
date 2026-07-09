import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import logger from "../config/logger";


const host = process.env.SMTP_HOST || "smtp.gmail.com";
const port = Number(process.env.SMTP_PORT || 465);
const secure = process.env.SMTP_SECURE === "true";

const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;


if (!user || !pass) {
  throw new Error(
    "SMTP email credentials are not configured."
  );
}


console.log("SMTP HOST:", host);
console.log("SMTP USER:", user);



const smtpOptions: SMTPTransport.Options = {

  host,

  port,

  secure,


  auth: {

    user,

    pass

  },


  tls: {

    rejectUnauthorized: false,

    // force IPv4
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




// VERIFY SMTP CONNECTION

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








// SEND EMAIL

export const sendEmail = async(options:{

 email:string;

 subject:string;

 html:string;

 attachments?:any[];

}):Promise<void>=>{


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









export const sendWelcomeEmail = async(

 email:string,

 name:string,

 tempPassword?:string,

 otpCode?:string


):Promise<void>=>{


const loginUrl =
`${process.env.FRONTEND_URL}/login`;



const html = `

<div style="font-family:Arial;padding:20px">

<h2>Welcome to Techzon LMS</h2>

<p>Hello ${name}</p>


<p>Your account has been approved.</p>


${
tempPassword
?
`
<p>Your temporary password:</p>

<h2>${tempPassword}</h2>
`
:
""
}



${
otpCode
?
`
<p>Your OTP:</p>

<h2>${otpCode}</h2>
`
:
""
}



<a href="${loginUrl}">
Login to LMS
</a>


<br/>

<p>
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

<p>Your OTP:</p>

<h1>${code}</h1>

`;



await sendEmail({

 email,

 subject:
 "Techzon LMS OTP Verification",

 html

});


};