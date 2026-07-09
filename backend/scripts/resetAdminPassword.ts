import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../models/User";

dotenv.config();

async function reset() {
  await mongoose.connect(process.env.MONGODB_URI!);

  const hashedPassword = await bcrypt.hash("Admin@123", 10);

  const admin = await User.findOneAndUpdate(
    { email: "admin@techzonwide.com" },
    {
      $set: {
        password: hashedPassword,
        role: "SuperAdmin",
        status: "active",
        isEmailVerified: true
      }
    },
    { new: true, upsert: true }
  );

  console.log("Admin password reset:", admin.email);

  process.exit();
}

reset();
