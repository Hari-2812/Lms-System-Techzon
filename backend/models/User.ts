import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'SuperAdmin' | 'Admin' | 'Mentor' | 'Student' | 'Support';
  status: 'active' | 'inactive' | 'suspended';
  isEmailVerified: boolean;
  otp?: string;
  otpExpiresAt?: Date;
  devices: Array<{
    deviceId: string;
    userAgent: string;
    ip: string;
    lastActive: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
  needsPasswordChange?: boolean;
  comparePassword(enteredPassword: string): Promise<boolean>;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      enum: ['SuperAdmin', 'Admin', 'Mentor', 'Student', 'Support'],
      default: 'Student',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    isEmailVerified: { type: Boolean, default: false },
    needsPasswordChange: { type: Boolean, default: false },
    otp: { type: String },
    otpExpiresAt: { type: Date },
    devices: [
      {
        deviceId: { type: String, required: true },
        userAgent: { type: String },
        ip: { type: String },
        lastActive: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  if (this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

UserSchema.methods.comparePassword = async function(
  enteredPassword: string
): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);
