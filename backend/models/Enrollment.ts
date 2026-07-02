import mongoose, { Schema, Document } from 'mongoose';

export interface IEnrollment extends Document {
  studentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  learningPlanId: mongoose.Types.ObjectId;
  batch?: string;
  mentorId?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  startDate: Date;
  expiryDate: Date;
  progress: {
    completedLessons: mongoose.Types.ObjectId[];
    percentComplete: number;
  };
  status: 'active' | 'expired' | 'suspended';
  certificateIssued: boolean;
  certificateId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EnrollmentSchema: Schema<IEnrollment> = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    learningPlanId: { type: Schema.Types.ObjectId, ref: 'LearningPlan', required: true, index: true },
    batch: { type: String, default: 'Batch A' },
    mentorId: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    startDate: { type: Date, required: true, default: Date.now },
    expiryDate: { type: Date, required: true },
    progress: {
      completedLessons: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
      percentComplete: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'suspended'],
      default: 'active',
      index: true,
    },
    certificateIssued: { type: Boolean, default: false },
    certificateId: { type: Schema.Types.ObjectId, ref: 'Certificate' },
  },
  { timestamps: true }
);

// Create compound index for single student-course enrollment
EnrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

export default mongoose.model<IEnrollment>('Enrollment', EnrollmentSchema);
