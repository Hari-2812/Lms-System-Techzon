import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;

  role:
    | "SuperAdmin"
    | "Admin"
    | "Mentor"
    | "Student"
    | "Support";

  status:
    | "active"
    | "inactive"
    | "suspended";

  isEmailVerified: boolean;

  otp?: string;
  otpExpiresAt?: Date;

  resetPasswordToken?: string;
  resetPasswordExpires?: Date;

  devices: Array<{
    deviceId: string;
    userAgent: string;
    ip: string;
    lastActive: Date;
  }>;

  needsPasswordChange?: boolean;

  studentProfile?: {
    phone?: string;
    dateOfBirth?: Date;
    gender?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    college?: string;
    qualification?: string;
    occupation?: string;
    experience?: string;
  };

  sourceInformation?: {
    source?: string;
    sourceRowId?: string;
    sourceSubmittedAt?: Date;
    syncedAt?: Date;
    syncStatus?: 'PENDING' | 'SYNCED' | 'UPDATED' | 'FAILED';
  };

  createdAt: Date;
  updatedAt: Date;

  comparePassword(
    enteredPassword: string
  ): Promise<boolean>;
}


const UserSchema: Schema<IUser> =
new Schema(
  {

    name: {
      type: String,
      required: true,
      trim: true
    },


    email: {

      type: String,

      required: true,

      unique: true,

      lowercase: true,

      trim: true

    },


    password: {

      type: String,

      required: true,

      select: false

    },


    role: {

      type: String,

      enum: [
        "SuperAdmin",
        "Admin",
        "Mentor",
        "Student",
        "Support"
      ],

      default: "Student"

    },


    status: {

      type: String,

      enum: [
        "active",
        "inactive",
        "suspended"
      ],

      default: "active"

    },


    isEmailVerified: {

      type: Boolean,

      default: false

    },


    needsPasswordChange: {
      type: Boolean,
      default: false
    },

    studentProfile: {
      phone: String,
      dateOfBirth: Date,
      gender: String,
      address: String,
      city: String,
      state: String,
      pincode: String,
      college: String,
      qualification: String,
      occupation: String,
      experience: String
    },

    sourceInformation: {
      source: { type: String, default: 'direct' },
      sourceRowId: String,
      sourceSubmittedAt: Date,
      syncedAt: Date,
      syncStatus: {
        type: String,
        enum: ['PENDING', 'SYNCED', 'UPDATED', 'FAILED'],
        default: 'PENDING'
      }
    },


    otp: String,

    otpExpiresAt: Date,

    resetPasswordToken: String,

    resetPasswordExpires: Date,


    devices: [

      {

        deviceId: {

          type: String,

          required: true

        },


        userAgent: String,


        ip: String,


        lastActive: {

          type: Date,

          default: Date.now

        }

      }

    ]

  },

  {
    timestamps: true
  }

);



// HASH PASSWORD ONLY WHEN CHANGED

UserSchema.pre(
  "save",
  async function(next){

    if(
      !this.isModified("password")
    ){

      return next();

    }


    if(this.password){

      this.password =
      await bcrypt.hash(
        this.password,
        10
      );

    }


    next();

  }
);



// PASSWORD COMPARE METHOD

UserSchema.methods.comparePassword =
async function(
  enteredPassword:string
):Promise<boolean>{


  return await bcrypt.compare(

    enteredPassword,

    this.password

  );

};



export default mongoose.model<IUser>(
  "User",
  UserSchema
);