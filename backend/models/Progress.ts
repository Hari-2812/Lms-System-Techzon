import mongoose, { Schema, Document } from 'mongoose';

export interface IProgress extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  currentTime: number;
  completionPercentage: number;
  isCompleted: boolean;
  lastWatched: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProgressSchema: Schema<IProgress> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    currentTime: { type: Number, default: 0 },
    completionPercentage: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false },
    lastWatched: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound index to quickly find progress for a specific user and lesson
ProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });

export default mongoose.model<IProgress>('Progress', ProgressSchema);
