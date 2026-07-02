import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'super-admin' | 'SuperAdmin' | 'admin' | 'mentor' | 'student' | 'support';
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
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String },
    role: {
      type: String,
      enum: ['super-admin', 'SuperAdmin', 'admin', 'mentor', 'student', 'support'],
      default: 'student',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    isEmailVerified: { type: Boolean, default: false },
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
  if (!this.isModified('password')) return next();
  if (this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(password, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);
