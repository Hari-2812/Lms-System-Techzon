import mongoose, { Schema, Document } from 'mongoose';

export interface ILesson extends Document {
  moduleId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  videoId?: mongoose.Types.ObjectId;
  provider?: string;
  bunnyVideoId?: string;
  playbackUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  notesUrl?: string; // PDF link
  downloads?: Array<{
    title: string;
    url: string;
  }>;
  order: number;
  isPublished?: boolean;
  legacy?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LessonSchema: Schema<ILesson> = new Schema(
  {
    moduleId: { type: Schema.Types.ObjectId, ref: 'Module', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    videoId: { type: Schema.Types.ObjectId, ref: 'Video' },
    provider: { type: String, default: 'bunny' },
    bunnyVideoId: { type: String },
    playbackUrl: { type: String },
    thumbnailUrl: { type: String },
    duration: { type: Number },
    notesUrl: { type: String },
    downloads: [
      {
        title: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
    order: { type: Number, required: true },
    isPublished: { type: Boolean, default: true },
    legacy: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<ILesson>('Lesson', LessonSchema);
