import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import logger from "../config/logger";
import dns from "dns";


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



const smtpOptions: SMTPTransport.Options = {

  host: "smtp.gmail.com",

  port: 465,

  secure: true,

  auth: {

    user: user,

    pass: pass

  },


  // Force Gmail SMTP IPv4 for Render
  getSocket: (options, callback) => {

  dns.lookup(
    options.host as string,
    {
      family: 4
    },
    (err, address) => {

      if (err) {

        return callback(
          err,
          null
        );

      }


      callback(
        null,
        {
          host: address,
          port: options.port
        }
      );


    }
  );

},

  connectionTimeout: 120000,

  greetingTimeout: 60000,

  socketTimeout: 120000

};


const transporter =
nodemailer.createTransport(
  smtpOptions
);







// SMTP CONNECTION CHECK

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







// COMMON SEND EMAIL FUNCTION

export const sendEmail = async (options: {

  email: string;

  subject: string;

  html: string;

  attachments?: any[];


}): Promise<void> => {


  try {


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


  catch (error: any) {


    logger.error(
      "SMTP SEND FAILED",
      {

        message: error.message,

        code: error.code,

        response: error.response

      }
    );


    throw error;


  }


};









// STUDENT WELCOME EMAIL

export const sendWelcomeEmail = async (

  email: string,

  name: string,

  tempPassword?: string,

  otpCode?: string


): Promise<void> => {



  const loginUrl =
    `${process.env.FRONTEND_URL}/login`;



  const passwordSection =

    tempPassword ?

      `

      <p>Your LMS Login Password:</p>

      <h2>${tempPassword}</h2>

      <p>
      Please change your password after first login.
      </p>

      `

      :

      "";





  const otpSection =

    otpCode ?

      `

      <p>Your Verification OTP:</p>

      <h2>${otpCode}</h2>

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

You can now access Techzon LMS.

</p>




${passwordSection}


${otpSection}




<div style="
text-align:center;
margin:30px;
">


<a href="${loginUrl}"

style="
background:#F57C20;
color:white;
padding:12px 25px;
border-radius:6px;
text-decoration:none;
font-weight:bold;
"

>

Login to LMS

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

export const sendOTPEmail = async (

  email: string,

  code: string


): Promise<void> => {



  const html = `


<div style="font-family:Arial;">


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