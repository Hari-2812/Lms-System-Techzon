import mongoose, { Schema, Document } from 'mongoose';

export interface IProjectAssignment extends Document {
  courseId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  domain: string;
  batch: string;
  title: string;
  description: string;
  instructions?: string;
  dueDate?: Date;
  requirements: string[]; // e.g. ['GitHub Repository URL', 'Live Project URL', 'Screenshots']
  assignedBy: mongoose.Types.ObjectId;
  assignedAt: Date;
  status: 'ASSIGNED' | 'SUBMITTED' | 'UNDER_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED';
  submissionId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectAssignmentSchema: Schema<IProjectAssignment> = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    domain: { type: String },
    batch: { type: String },
    title: { type: String, required: true },
    description: { type: String, required: true },
    instructions: { type: String },
    dueDate: { type: Date },
    requirements: [{ type: String }],
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['ASSIGNED', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED'],
      default: 'ASSIGNED',
    },
    submissionId: { type: Schema.Types.ObjectId, ref: 'ProjectSubmission' },
  },
  { timestamps: true }
);

ProjectAssignmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

export default mongoose.model<IProjectAssignment>('ProjectAssignment', ProjectAssignmentSchema);
