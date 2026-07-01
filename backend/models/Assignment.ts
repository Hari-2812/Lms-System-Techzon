import mongoose, { Schema, Document } from 'mongoose';

export interface IAssignment extends Document {
  title: string;
  description: string;
  courseId: mongoose.Types.ObjectId;
  moduleId: mongoose.Types.ObjectId;
  lessonId?: mongoose.Types.ObjectId;
  fileUrl?: string; // instructions pdf/zip
  deadline: Date;
  maxMarks: number;
  rubrics: Array<{
    criteria: string;
    marks: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema: Schema<IAssignment> = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    moduleId: { type: Schema.Types.ObjectId, ref: 'Module', required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    fileUrl: { type: String },
    deadline: { type: Date, required: true },
    maxMarks: { type: Number, required: true, default: 100 },
    rubrics: [
      {
        criteria: { type: String, required: true },
        marks: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model<IAssignment>('Assignment', AssignmentSchema);
