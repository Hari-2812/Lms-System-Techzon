import mongoose, { Schema, Document } from 'mongoose';

export interface IProgress extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  lastPlaybackPosition: number;
  watchedPercentage: number;
  completed: boolean;
  completedAt?: Date;
  lastWatched: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProgressSchema: Schema<IProgress> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    lastPlaybackPosition: { type: Number, default: 0 },
    watchedPercentage: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    lastWatched: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound index to quickly find progress for a specific user and lesson
ProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });

export default mongoose.model<IProgress>('Progress', ProgressSchema);
