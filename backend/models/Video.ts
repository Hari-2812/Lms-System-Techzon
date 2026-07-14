import mongoose, { Schema, Document } from 'mongoose';

export interface IVideo extends Document {
  publicId: string;
  secureUrl: string;
  duration: number;
  thumbnail?: string;
  folder: string;
  order: number;
  moduleId?: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VideoSchema: Schema<IVideo> = new Schema(
  {
    publicId: { type: String, required: true, unique: true },
    secureUrl: { type: String, required: true },
    duration: { type: Number, default: 0 },
    thumbnail: { type: String },
    folder: { type: String, required: true, index: true },
    order: { type: Number, default: 0 },
    moduleId: { type: Schema.Types.ObjectId, ref: 'Module', index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.model<IVideo>('Video', VideoSchema);
