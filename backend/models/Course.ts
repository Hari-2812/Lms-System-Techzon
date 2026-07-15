import mongoose, { Schema, Document } from 'mongoose';

export interface ICourse extends Document {
  title: string;
  slug: string;
  description: string;
  category: string;
  thumbnailUrl?: string;
  trailerUrl?: string;
  mentors: mongoose.Types.ObjectId[];
  status: 'draft' | 'published' | 'archived';
  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  cloudinaryFolder?: string;
  duration?: number;
  price?: number;
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema: Schema<ICourse> = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    category: { type: String, required: true, index: true },
    thumbnailUrl: { type: String },
    trailerUrl: { type: String },
    mentors: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    seo: {
      title: { type: String },
      description: { type: String },
      keywords: [{ type: String }],
    },
    cloudinaryFolder: { type: String, trim: true },
    duration: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<ICourse>('Course', CourseSchema);
