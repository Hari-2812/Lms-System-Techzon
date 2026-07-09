import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User";

dotenv.config();

async function test(){

 await mongoose.connect(
  process.env.MONGODB_URI!
 );

 const user =
 await User.findOne({
  email:"admin@techzonwide.com"
 })
 .select("+password");


 if(!user){

  console.log("ADMIN NOT FOUND");
  process.exit();

 }


 console.log(
  "Password exists:",
  !!user.password
 );


 const result =
 await user.comparePassword(
  "Admin@123"
 );


 console.log(
  "LOGIN RESULT:",
  result
 );


 process.exit();

}


test();