import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../models/User";

dotenv.config();

async function createAdmin() {
  await mongoose.connect(process.env.MONGODB_URI!);

  await User.deleteOne({
    email: "admin@techzonwide.com"
  });

  const hash = await bcrypt.hash("Admin@123", 10);

  await User.create({
    name: "Techzon Admin",
    email: "admin@techzonwide.com",
    password: hash,
    role: "SuperAdmin",
    status: "active",
    isEmailVerified: true
  });

  console.log("Admin created successfully");
  process.exit();
}

createAdmin();
