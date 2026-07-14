import mongoose, { Schema, Document } from 'mongoose';

export interface IVideo extends Document {
  title?: string;
  publicId: string;
  secureUrl: string;
  playbackUrl?: string;
  duration: number;
  bytes?: number;
  format?: string;
  thumbnail?: string;
  tags?: string[];
  version?: string;
  resourceType?: string;
  displayName?: string;
  order: number;
  moduleId?: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VideoSchema: Schema<IVideo> = new Schema(
  {
    title: { type: String },
    publicId: { type: String, required: true, unique: true },
    secureUrl: { type: String, required: true },
    playbackUrl: { type: String },
    duration: { type: Number, default: 0 },
    bytes: { type: Number },
    format: { type: String },
    thumbnail: { type: String },
    tags: [{ type: String }],
    version: { type: String },
    resourceType: { type: String },
    displayName: { type: String },
    order: { type: Number, default: 0 },
    moduleId: { type: Schema.Types.ObjectId, ref: 'Module', index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.model<IVideo>('Video', VideoSchema);
