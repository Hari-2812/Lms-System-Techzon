import mongoose, { Schema, Document } from 'mongoose';

export interface ILesson extends Document {
  moduleId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  videoUrl?: string;
  videoDuration?: number; // duration in seconds
  notesUrl?: string; // PDF link
  downloads?: Array<{
    title: string;
    url: string;
  }>;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const LessonSchema: Schema<ILesson> = new Schema(
  {
    moduleId: { type: Schema.Types.ObjectId, ref: 'Module', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    videoUrl: { type: String },
    videoDuration: { type: Number, default: 0 },
    notesUrl: { type: String },
    downloads: [
      {
        title: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
    order: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<ILesson>('Lesson', LessonSchema);
