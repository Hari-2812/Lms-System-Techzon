import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../models/User";

dotenv.config();

async function reset() {
  await mongoose.connect(process.env.MONGODB_URI!);

  await User.deleteOne({ email: "admin@techzonwide.com" });

  const admin = new User({
    name: "Techzon Admin",
    email: "admin@techzonwide.com",
    password: "Admin@123",
    role: "SuperAdmin",
    status: "active",
    isEmailVerified: true
  });

  await admin.save();

  console.log("Admin password reset:", admin.email);

  process.exit();
}

reset();
