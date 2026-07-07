import mongoose, { Schema, Document } from 'mongoose';

export interface IOnboarding extends Document {
  fullName: string;
  email: string;
  phone: string;
  college: string;
  degree: string;
  city: string;
  state: string;
  courses: mongoose.Types.ObjectId[];
  learningPlan: mongoose.Types.ObjectId;
  preferredBatch?: string;
  preferredMentor?: mongoose.Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected';
  remarks?: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  source: 'direct' | 'google-sheets' | 'GOOGLE_FORM';
  googleRowId?: string;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OnboardingSchema: Schema<IOnboarding> = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
      unique: process.env.NODE_ENV === 'production',
    },
    phone: { type: String, required: true, trim: true },
    college: { type: String, default: '', trim: true },
    degree: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    state: { type: String, default: '', trim: true },
    courses: [{ type: Schema.Types.ObjectId, ref: 'Course', required: true }],
    learningPlan: { type: Schema.Types.ObjectId, ref: 'LearningPlan', required: true },
    preferredBatch: { type: String },
    preferredMentor: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    remarks: { type: String },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    source: { type: String, enum: ['direct', 'google-sheets', 'GOOGLE_FORM'], default: 'direct', index: true },
    googleRowId: { type: String, index: true, sparse: true },
    submittedAt: { type: Date, index: true },
  },
  { timestamps: true }
);

OnboardingSchema.index({ email: 1, submittedAt: 1 }, { unique: true, sparse: true });

export default mongoose.model<IOnboarding>('Onboarding', OnboardingSchema);
