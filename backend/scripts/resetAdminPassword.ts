import mongoose from "mongoose";
import dotenv from "dotenv";

import User from "../models/User";


dotenv.config();



async function resetAdmin(){

  try{


    await mongoose.connect(
      process.env.MONGODB_URI!
    );


    console.log(
      "MongoDB Connected"
    );



    // Remove old broken admin

    await User.deleteOne({

      email:
      "admin@techzonwide.com"

    });



    // Create fresh admin
    // password hashing handled by User.ts pre-save


    const admin =
    await User.create({

      name:
      "Techzon Admin",


      email:
      "admin@techzonwide.com",


      password:
      "Admin@123",


      role:
      "SuperAdmin",


      status:
      "active",


      isEmailVerified:
      true,


      needsPasswordChange:
      false,


      devices:
      []

    });



    console.log(

      "ADMIN CREATED:",

      admin.email

    );



    process.exit(0);



  }catch(error){


    console.error(

      "ADMIN RESET FAILED:",

      error

    );


    process.exit(1);

  }

}



resetAdmin();