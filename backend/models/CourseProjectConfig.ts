import mongoose, { Schema, Document } from 'mongoose';

export interface IProjectConfig {
  title: string;
  description: string;
  instructions?: string;
  projectPdf?: string;
  requirements: any[];
  isActive: boolean;
}

export interface ICourseProjectConfig extends Document {
  courseId: mongoose.Types.ObjectId;
  minorProject: IProjectConfig;
  majorProject: IProjectConfig;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectConfigSchema = new Schema<IProjectConfig>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  instructions: { type: String },
  projectPdf: { type: String },
  requirements: [{ type: Schema.Types.Mixed }],
  isActive: { type: Boolean, default: true },
});

const CourseProjectConfigSchema: Schema<ICourseProjectConfig> = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, unique: true },
    minorProject: { type: ProjectConfigSchema, required: true },
    majorProject: { type: ProjectConfigSchema, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<ICourseProjectConfig>('CourseProjectConfig', CourseProjectConfigSchema);
